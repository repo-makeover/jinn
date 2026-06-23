
import { useEffect, useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { api } from '@/lib/api'
import type { Employee, OrgData } from '@/lib/api'
import { useGateway } from '@/hooks/use-gateway'
import type { KanbanTicket, TicketStatus, TicketPriority, TicketComplexity } from '@/lib/kanban/types'
import {
  saveTickets,
  createTicket,
  updateTicket,
  appendTicketNote,
  moveTicket,
  deleteTicket,
  type KanbanStore,
} from '@/lib/kanban/store'
import { PageLayout, ToolbarActions } from '@/components/page-layout'
import { useBreadcrumbs } from '@/context/breadcrumb-context'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { CreateTicketModal } from '@/components/kanban/create-ticket-modal'
import { TicketDetailPanel } from '@/components/kanban/ticket-detail-panel'

/** Delete confirmation dialog */
function DeleteConfirmDialog({
  ticket,
  onConfirm,
  onCancel,
}: {
  ticket: KanbanTicket
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent
        showCloseButton={false}
        className="bg-[var(--bg)] border border-[var(--separator)] rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] max-w-[400px]"
      >
        <DialogHeader>
          <DialogTitle
            className="text-[length:var(--text-title3)] font-[var(--weight-bold)] text-[var(--text-primary)]"
          >
            Delete Ticket
          </DialogTitle>
          <DialogDescription
            className="text-[length:var(--text-footnote)] text-[var(--text-secondary)] leading-[1.5]"
          >
            Are you sure you want to delete &ldquo;{ticket.title}&rdquo;? This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            onClick={onCancel}
            className="px-[var(--space-4)] py-[var(--space-2)] rounded-[var(--radius-md)] border border-[var(--separator)] bg-transparent text-[var(--text-secondary)] text-[length:var(--text-footnote)] font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className="px-[var(--space-4)] py-[var(--space-2)] rounded-[var(--radius-md)] border-none bg-[var(--system-red)] text-white text-[length:var(--text-footnote)] font-semibold cursor-pointer"
          >
            Delete
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function KanbanPage() {
  useBreadcrumbs([{ label: 'Kanban' }])
  const { subscribe } = useGateway()
  const [tickets, setTickets] = useState<KanbanStore>({})
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<KanbanTicket | null>(null)
  const [filterEmployeeId, setFilterEmployeeId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<KanbanTicket | null>(null)

  const loadData = useCallback(() => {
    setLoading(true)
    setError(null)

    // Load employees from API, then load board data from department boards
    api
      .getOrg()
      .then(async (data: OrgData) => {
        setEmployees(data.employees)
        setDepartments(data.departments)

        // Load board tickets from all departments
        const boardTickets: KanbanStore = {}
        for (const dept of data.departments) {
          try {
            const board = await api.getDepartmentBoard(dept) as unknown as Array<{
              id: string
              title: string
              description?: string
              status: string
              priority?: string
              complexity?: string
              assignee?: string
              createdAt?: string
              updatedAt?: string
            }>
            if (Array.isArray(board)) {
              for (const item of board) {
                // Map board.json status to kanban statuses
                const statusMap: Record<string, TicketStatus> = {
                  todo: 'todo',
                  'in_progress': 'in-progress',
                  'in-progress': 'in-progress',
                  done: 'done',
                  blocked: 'blocked',
                  backlog: 'backlog',
                  review: 'review',
                }
                const status = statusMap[item.status] || 'todo'
                const priorityMap: Record<string, TicketPriority> = {
                  low: 'low',
                  medium: 'medium',
                  high: 'high',
                }
                const priority = priorityMap[item.priority || 'medium'] || 'medium'
                const complexityMap: Record<string, TicketComplexity> = {
                  low: 'low',
                  medium: 'medium',
                  high: 'high',
                }
                const complexity = complexityMap[item.complexity || 'medium'] || 'medium'
                boardTickets[item.id] = {
                  id: item.id,
                  title: item.title,
                  description: item.description || '',
                  status,
                  priority,
                  complexity,
                  assigneeId: item.assignee || null,
                  department: dept,
                  workState: 'idle',
                  createdAt: item.createdAt ? new Date(item.createdAt).getTime() : Date.now(),
                  updatedAt: item.updatedAt ? new Date(item.updatedAt).getTime() : Date.now(),
                  departmentId: dept,
                }
              }
            }
          } catch {
            // Department may not have a board.json, that's fine
          }
        }

        // API is the sole source of truth on load. Do not merge localStorage —
        // agent-made changes (moves, deletes) are only reflected in the API,
        // and stale localStorage entries would cause ghost / wrong-state tickets.
        setTickets(boardTickets)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const unsubscribe = subscribe((event, payload) => {
      if (event !== 'board:updated') return
      const department =
        payload && typeof payload === 'object' && 'department' in payload
          ? String((payload as { department?: unknown }).department ?? '')
          : ''
      if (!department || departments.length === 0 || departments.includes(department)) {
        loadData()
      }
    })
    return unsubscribe
  }, [subscribe, departments, loadData])

  // Persist tickets to both localStorage and the API whenever the store changes
  useEffect(() => {
    if (!loading) {
      saveTickets(tickets)
    }
  }, [tickets, loading])

  /**
   * Persist the current ticket store back to each department's board via the
   * gateway API. Tickets without a departmentId are silently skipped (they
   * remain in localStorage only until a department can be assigned).
   */
  const persistToApi = useCallback(
    async (store: KanbanStore, deletedIds: string[] = []) => {
      // Group tickets by their department
      const byDept: Record<string, KanbanTicket[]> = {}
      for (const ticket of Object.values(store)) {
        if (!ticket.departmentId) continue
        if (!byDept[ticket.departmentId]) byDept[ticket.departmentId] = []
        byDept[ticket.departmentId].push(ticket)
      }

      // Also PUT an empty array for any department that no longer has tickets
      // so deleted tickets don't come back on the next reload
      for (const dept of departments) {
        if (!byDept[dept]) byDept[dept] = []
      }

      // Write each department board. Errors are surfaced to the UI and the
      // board is refetched from the gateway so optimistic local state does not
      // become the hidden source of truth.
      await Promise.all(
        Object.entries(byDept).map(([dept, deptTickets]) => {
          const boardData = deptTickets.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            status: t.status === 'in-progress' ? 'in_progress' : t.status,
            priority: t.priority,
            complexity: t.complexity,
            assignee: t.assigneeId ?? undefined,
            createdAt: new Date(t.createdAt).toISOString(),
            updatedAt: new Date(t.updatedAt).toISOString(),
          }))
          return api.updateDepartmentBoard(dept, {
            tickets: boardData,
            deletedIds,
          })
        }),
      )
    },
    [departments],
  )

  const persistBoardChange = useCallback(
    (store: KanbanStore, deletedIds: string[] = []) => {
      setSaveError(null)
      void persistToApi(store, deletedIds).catch((err) => {
        setSaveError(err instanceof Error ? err.message : 'Failed to save board changes.')
        loadData()
      })
    },
    [persistToApi, loadData],
  )

  // Keep selectedTicket in sync with store
  useEffect(() => {
    if (selectedTicket && tickets[selectedTicket.id]) {
      const current = tickets[selectedTicket.id]
      if (current.updatedAt !== selectedTicket.updatedAt) {
        setSelectedTicket(current)
      }
    }
  }, [tickets, selectedTicket])

  function handleCreateTicket(data: {
    title: string
    description: string
    priority: TicketPriority
    complexity: TicketComplexity
    assigneeId: string | null
  }) {
    // Infer department from assignee, fallback to first known department
    const emp = data.assigneeId ? employees.find(e => e.name === data.assigneeId) : null
    const departmentId = emp?.department || departments[0] || null

    setTickets((prev) => {
      const next = createTicket(prev, {
        ...data,
        status: 'backlog',
        department: departmentId,
        departmentId,
      })
      persistBoardChange(next)
      return next
    })
  }

  function handleMoveTicket(ticketId: string, status: TicketStatus) {
    setTickets((prev) => {
      const next = moveTicket(prev, ticketId, status)
      persistBoardChange(next)
      return next
    })
  }

  function handleDeleteTicket(ticketId: string) {
    setTickets((prev) => {
      const next = deleteTicket(prev, ticketId)
      persistBoardChange(next, [ticketId])
      return next
    })
    setSelectedTicket(null)
    setDeleteConfirm(null)
  }

  function handleAssigneeChange(ticketId: string, assigneeId: string | null) {
    // Update department when assignee changes
    const emp = assigneeId ? employees.find(e => e.name === assigneeId) : null
    const updates: Partial<Omit<KanbanTicket, 'id' | 'createdAt'>> = { assigneeId }
    if (emp?.department) {
      updates.department = emp.department
    }
    setTickets((prev) => {
      const next = updateTicket(prev, ticketId, updates)
      persistBoardChange(next)
      return next
    })
  }

  function handleComplexityChange(ticketId: string, complexity: TicketComplexity) {
    setTickets((prev) => {
      const next = updateTicket(prev, ticketId, { complexity })
      persistBoardChange(next)
      return next
    })
  }

  function handleSaveDetails(ticketId: string, updates: Pick<KanbanTicket, 'title' | 'description'>) {
    setTickets((prev) => {
      const next = updateTicket(prev, ticketId, updates)
      persistBoardChange(next)
      return next
    })
  }

  function handleAppendNote(ticketId: string, updates: { title: string; description: string; note: string }) {
    setTickets((prev) => {
      const next = updateTicket(prev, ticketId, {
        title: updates.title,
        description: appendTicketNote(updates.description, updates.note),
      })
      persistBoardChange(next)
      return next
    })
  }

  function handleRunNow(ticketId: string) {
    const ticket = tickets[ticketId]
    const department = ticket?.departmentId ?? ticket?.department ?? ''
    if (!ticket || !department) {
      setSaveError('Ticket is missing its department.')
      return
    }

    setSaveError(null)
    setTickets((prev) => updateTicket(prev, ticketId, { workState: 'starting' }))
    void api.dispatchTicket(department, ticketId)
      .catch((err) => {
        setSaveError(err instanceof Error ? err.message : 'Failed to start ticket.')
        loadData()
      })
  }

  function handleTicketClick(ticket: KanbanTicket) {
    setSelectedTicket(ticket)
  }

  if (error) {
    return (
      <PageLayout>
        <div
          className="flex flex-col items-center justify-center h-full gap-[var(--space-4)] text-[var(--text-tertiary)]"
        >
          <div
            className="rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--system-red)_10%,transparent)] border border-[color-mix(in_srgb,var(--system-red)_30%,transparent)] px-[var(--space-4)] py-[var(--space-3)] text-[length:var(--text-body)] text-[var(--system-red)]"
          >
            Failed to load employees: {error}
          </div>
          <button
            onClick={loadData}
            className="px-[var(--space-4)] py-[var(--space-2)] rounded-[var(--radius-md)] bg-[var(--accent)] text-[var(--accent-contrast)] border-none cursor-pointer text-[length:var(--text-body)] font-[var(--weight-semibold)]"
          >
            Retry
          </button>
        </div>
      </PageLayout>
    )
  }

  const ticketCount = Object.keys(tickets).length

  // Employees that have at least one ticket assigned
  const assignedEmployeeNames = new Set(
    Object.values(tickets)
      .map((t) => t.assigneeId)
      .filter(Boolean),
  )
  const assignedEmployees = employees.filter((e) => assignedEmployeeNames.has(e.name))

  return (
    <PageLayout>
      <div className="flex h-full relative bg-[var(--bg)]">
        {/* Board area */}
        <div className="flex-1 h-full flex flex-col min-w-0">
          {/* Header */}
          <div
            className="px-[var(--space-5)] py-[var(--space-4)] flex items-center justify-between shrink-0 border-b border-[var(--separator)]"
          >
            <div>
              <h1
                className="text-[length:var(--text-title2)] font-[var(--weight-bold)] text-[var(--text-primary)] m-0 tracking-[-0.3px]"
              >
                Kanban Board
              </h1>
              <p
                className="text-[length:var(--text-caption1)] text-[var(--text-tertiary)] mt-[2px] mb-0"
              >
                {ticketCount} ticket{ticketCount !== 1 ? 's' : ''}
              </p>
            </div>

            <ToolbarActions>
              <button
                onClick={() => setCreateOpen(true)}
                className="rounded-[var(--radius-md)] px-4 py-2 text-[length:var(--text-footnote)] font-[var(--weight-semibold)] border-none flex items-center gap-[var(--space-2)] bg-[var(--accent)] text-white cursor-pointer"
              >
                <Plus size={16} />
                New Ticket
              </button>
            </ToolbarActions>
          </div>

          {saveError && (
            <div className="mx-[var(--space-5)] mt-[var(--space-3)] rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--system-red)_35%,transparent)] bg-[color-mix(in_srgb,var(--system-red)_10%,transparent)] px-[var(--space-3)] py-[var(--space-2)] text-[length:var(--text-caption1)] text-[var(--system-red)] flex items-center justify-between gap-[var(--space-3)]">
              <span className="min-w-0 break-words">Board save failed: {saveError}</span>
              <button
                onClick={() => {
                  setSaveError(null)
                  loadData()
                }}
                className="shrink-0 rounded-[var(--radius-sm)] border border-current bg-transparent px-[var(--space-2)] py-[2px] text-[length:var(--text-caption2)] font-semibold cursor-pointer"
              >
                Reload
              </button>
            </div>
          )}

          {/* Employee filter bar */}
          {assignedEmployees.length > 0 && (
            <div
              className="flex items-center gap-[var(--space-2)] px-[var(--space-5)] py-[var(--space-2)] overflow-x-auto shrink-0"
            >
              <button
                onClick={() => setFilterEmployeeId(null)}
                className={`flex items-center gap-[var(--space-1)] px-3 py-1 rounded-full border-none text-[length:var(--text-caption1)] font-semibold cursor-pointer shrink-0 ${
                  filterEmployeeId === null
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--fill-tertiary)] text-[var(--text-secondary)]'
                }`}
              >
                All
              </button>
              {assignedEmployees.map((emp) => (
                <button
                  key={emp.name}
                  onClick={() =>
                    setFilterEmployeeId(filterEmployeeId === emp.name ? null : emp.name)
                  }
                  className={`flex items-center gap-[var(--space-1)] px-3 py-1 rounded-full border-none text-[length:var(--text-caption1)] font-semibold cursor-pointer shrink-0 ${
                    filterEmployeeId === emp.name
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--fill-tertiary)] text-[var(--text-secondary)]'
                  }`}
                >
                  {emp.displayName}
                </button>
              ))}
            </div>
          )}

          {/* Board */}
          <div className="flex-1 px-[var(--space-3)] min-h-0">
            {loading ? (
              <div
                className="flex items-center justify-center h-full text-[var(--text-tertiary)] text-[length:var(--text-caption1)]"
              >
                Loading...
              </div>
            ) : (
              <KanbanBoard
                tickets={tickets}
                employees={employees}
                onTicketClick={handleTicketClick}
                onMoveTicket={handleMoveTicket}
                onCreateTicket={() => setCreateOpen(true)}
                onDeleteTicket={(ticket) => setDeleteConfirm(ticket)}
                filterEmployeeId={filterEmployeeId}
              />
            )}
          </div>
        </div>

        {/* Mobile backdrop */}
        {selectedTicket && (
          <div
            className="fixed inset-0 z-30 lg:hidden bg-black/50"
            onClick={() => setSelectedTicket(null)}
          />
        )}

        {/* Detail panel */}
        {selectedTicket && (
            <TicketDetailPanel
              ticket={selectedTicket}
              employees={employees}
              onClose={() => setSelectedTicket(null)}
              onStatusChange={(status) => handleMoveTicket(selectedTicket.id, status)}
              onComplexityChange={(complexity) => handleComplexityChange(selectedTicket.id, complexity)}
              onAssigneeChange={(name) => handleAssigneeChange(selectedTicket.id, name)}
              onRunNow={() => handleRunNow(selectedTicket.id)}
              onDelete={() => setDeleteConfirm(selectedTicket)}
              onSaveDetails={(updates) => handleSaveDetails(selectedTicket.id, updates)}
              onAppendNote={(updates) => handleAppendNote(selectedTicket.id, updates)}
            />
        )}

        {/* Delete confirmation dialog */}
        {deleteConfirm && (
          <DeleteConfirmDialog
            ticket={deleteConfirm}
            onConfirm={() => handleDeleteTicket(deleteConfirm.id)}
            onCancel={() => setDeleteConfirm(null)}
          />
        )}

        {/* Create ticket modal */}
        <CreateTicketModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          employees={employees}
          onSubmit={handleCreateTicket}
        />
      </div>
    </PageLayout>
  )
}
