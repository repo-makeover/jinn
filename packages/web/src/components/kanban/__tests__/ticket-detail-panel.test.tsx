import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TicketDetailPanel } from '../ticket-detail-panel'
import type { TicketSessionResponse } from '@/lib/api'
import type { KanbanTicket } from '@/lib/kanban/types'

const { getTicketSession, subscribeMock } = vi.hoisted(() => ({
  getTicketSession: vi.fn<(department: string, ticketId: string) => Promise<TicketSessionResponse>>(),
  subscribeMock: vi.fn<(fn: (event: string, payload: unknown) => void) => () => void>(),
}))

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return {
    ...actual,
    api: {
      ...actual.api,
      getTicketSession,
    },
  }
})

vi.mock('@/hooks/use-gateway', () => ({
  useGateway: () => ({
    subscribe: subscribeMock,
  }),
}))

vi.mock('../employee-picker', () => ({
  EmployeePicker: () => <div data-testid="employee-picker" />,
}))

vi.mock('@/components/chat/chat-messages', () => ({
  ChatMessages: ({ messages }: { messages: Array<{ content: string }> }) => (
    <div data-testid="chat-messages">{messages.map((message) => message.content).join('|')}</div>
  ),
}))

const baseTicket: KanbanTicket = {
  id: 'ticket-live',
  title: 'Live worker',
  description: 'Watch the session',
  status: 'in-progress',
  priority: 'medium',
  complexity: 'medium',
  assigneeId: 'worker',
  department: 'software-delivery',
  workState: 'working',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  departmentId: 'software-delivery',
}

const employees = [
  {
    name: 'worker',
    displayName: 'Worker',
    department: 'software-delivery',
    rank: 'employee' as const,
    engine: 'claude',
    model: 'opus',
    persona: '',
  },
]

function renderPanel(ticket: KanbanTicket = baseTicket) {
  return render(
    <MemoryRouter>
      <TicketDetailPanel
        ticket={ticket}
        employees={employees}
        onClose={vi.fn()}
        onStatusChange={vi.fn()}
        onComplexityChange={vi.fn()}
        onAssigneeChange={vi.fn()}
        onRunNow={vi.fn()}
        onDelete={vi.fn()}
      />
    </MemoryRouter>,
  )
}

describe('TicketDetailPanel live session', () => {
  beforeEach(() => {
    getTicketSession.mockReset()
    subscribeMock.mockReset()
    subscribeMock.mockReturnValue(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows live session header fields from the resolver response', async () => {
    getTicketSession.mockResolvedValue({
      found: true,
      sessionId: 's1',
      status: 'running',
      engine: 'claude',
      model: 'opus',
      totalCost: 12.34,
      lastActivityIso: '2026-06-22T10:00:00.000Z',
      lastActivityAgoMs: 4000,
      messages: [
        { role: 'assistant', text: 'Thinking through it', ts: 1, kind: 'message' },
        { role: 'assistant', text: 'Used read', ts: 2, kind: 'tool_call', toolCall: 'read' },
      ],
    })

    renderPanel()

    expect(await screen.findByText('Live session')).toBeDefined()
    expect(screen.getByText(/running/i)).toBeDefined()
    expect(screen.getByText('claude · opus')).toBeDefined()
    expect(screen.getByText('cost $12.34')).toBeDefined()
    expect(screen.getByText('active 4s ago')).toBeDefined()
    expect(screen.getByText(/Showing latest 8 messages/i)).toBeDefined()
    expect(screen.getByTestId('chat-messages').textContent).toContain('Thinking through it')
  })

  it('hides the live session section when the ticket is not in progress and no session is found', async () => {
    getTicketSession.mockResolvedValue({ found: false })

    renderPanel({ ...baseTicket, status: 'done' })

    await waitFor(() => expect(getTicketSession).toHaveBeenCalled())
    expect(screen.queryByText('Live session')).toBeNull()
    expect(screen.queryByText(/No active session for this ticket/i)).toBeNull()
  })

  it('unsubscribes and clears the polling interval on unmount', async () => {
    const unsubscribe = vi.fn()
    subscribeMock.mockReturnValue(unsubscribe)
    getTicketSession.mockResolvedValue({
      found: true,
      sessionId: 's-cleanup',
      status: 'running',
      engine: 'claude',
      model: 'opus',
      lastActivityIso: '2026-06-22T10:00:00.000Z',
      lastActivityAgoMs: 2000,
      messages: [],
    })
    const setSpy = vi.spyOn(window, 'setInterval').mockReturnValue(123 as unknown as number)
    const clearSpy = vi.spyOn(window, 'clearInterval')

    const view = renderPanel()
    await waitFor(() => expect(getTicketSession).toHaveBeenCalled())

    view.unmount()

    expect(setSpy).toHaveBeenCalled()
    expect(unsubscribe.mock.calls.length).toBeGreaterThanOrEqual(1)
    expect(clearSpy).toHaveBeenCalledWith(123)
  })
})
