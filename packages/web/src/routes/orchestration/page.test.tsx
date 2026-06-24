import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import OrchestrationPage from "./page"
import {
  loadOrchestrationDashboard,
  retryContinuation,
  selectDualLaneWinner,
  type OrchestrationDashboardData,
} from "@/lib/orchestration-api"

vi.mock("@/components/page-layout", () => ({
  PageLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ToolbarActions: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock("@/lib/orchestration-api", () => ({
  loadOrchestrationDashboard: vi.fn(),
  retryContinuation: vi.fn(async () => ({ ok: true })),
  selectDualLaneWinner: vi.fn(async () => ({ ok: true })),
}))

const loadMock = vi.mocked(loadOrchestrationDashboard)
const retryMock = vi.mocked(retryContinuation)
const selectMock = vi.mocked(selectDualLaneWinner)

beforeEach(() => {
  vi.clearAllMocks()
})

describe("OrchestrationPage", () => {
  it("renders disabled runtime state and empty operational sections", async () => {
    loadMock.mockResolvedValueOnce(sampleData({
      status: {
        enabled: false,
        runtimeBound: false,
        degraded: false,
        disabledReason: "orchestration is disabled",
        degradedReason: null,
        counts: { workers: 0, runningLeases: 0, queueItems: 0, allocations: 0, continuations: 0, activeWork: false },
      },
      workers: [],
    }))

    render(<OrchestrationPage />)

    expect(await screen.findByText("Disabled by gateway configuration")).toBeTruthy()
    expect(screen.getByText("orchestration is disabled")).toBeTruthy()
    activateTab("Workers")
    expect(await screen.findByText("No rows.")).toBeTruthy()
  })

  it("shows retry only for failed continuations and runs the retry action", async () => {
    loadMock.mockResolvedValue(sampleData({
      continuations: [
        { taskId: "failed-task", coordinatorId: "coord", mode: "single_worker", state: "failed", retryCount: 1, updatedAt: "2026-06-24T10:00:00.000Z", lastError: "engine failed" },
        { taskId: "queued-task", coordinatorId: "coord", mode: "single_worker", state: "queued", retryCount: 0, updatedAt: "2026-06-24T10:00:00.000Z" },
      ],
    }))

    render(<OrchestrationPage />)
    await screen.findByRole("tab", { name: "Continuations" })
    activateTab("Continuations")

    const retryButtons = await screen.findAllByRole("button", { name: "Retry" })
    expect(retryButtons).toHaveLength(2)
    expect((retryButtons[0] as HTMLButtonElement).disabled).toBe(false)
    expect((retryButtons[1] as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(retryButtons[0])

    await waitFor(() => expect(retryMock).toHaveBeenCalledWith("failed-task", "coord"))
  })

  it("enables selection only for selection_required dual-lane manifests", async () => {
    loadMock.mockResolvedValue(sampleData({
      dualLane: [
        dualLaneRun("select-task", "selection_required"),
        dualLaneRun("done-task", "selected"),
      ],
    }))

    render(<OrchestrationPage />)
    await screen.findByRole("tab", { name: "Dual-lane" })
    activateTab("Dual-lane")

    const openaiButtons = await screen.findAllByRole("button", { name: "Select openai" })
    expect(openaiButtons).toHaveLength(2)
    expect((openaiButtons[0] as HTMLButtonElement).disabled).toBe(false)
    expect((openaiButtons[1] as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(openaiButtons[0])

    await waitFor(() => expect(selectMock).toHaveBeenCalledWith("select-task", "openai"))
  })
})

function sampleData(overrides: Partial<OrchestrationDashboardData> = {}): OrchestrationDashboardData {
  return {
    status: {
      enabled: true,
      runtimeBound: true,
      degraded: false,
      disabledReason: null,
      degradedReason: null,
      counts: { workers: 1, runningLeases: 0, queueItems: 0, allocations: 0, continuations: 0, activeWork: false },
    },
    workers: [{
      id: "worker-1",
      provider: "mock",
      family: "local",
      tier: "frontier",
      capabilities: ["repo_edit"],
      tools: ["filesystem"],
      maxConcurrentTasks: 1,
      costClass: "low",
      workspacePolicy: "shared",
    }],
    leases: [],
    queue: [],
    allocations: [],
    continuations: [],
    telemetry: {
      maxBytes: 1000,
      maxRecords: 100,
      summary: {
        totals: bucket(0),
        byProvider: {},
        byFamily: {},
        byRole: {},
        byWorker: {},
        skippedLines: 0,
      },
    },
    worktrees: [],
    dualLane: [],
    ...overrides,
  }
}

function bucket(count: number) {
  return {
    count,
    dispositions: {},
    totalCost: 0,
    avgCost: null,
    totalLatencyMs: 0,
    avgLatencyMs: null,
    totalTokens: 0,
    avgTokens: null,
    filesChanged: 0,
    testsAdded: 0,
    testsPassed: 0,
    reviewBlockers: 0,
    humanEdits: 0,
    regressions: 0,
    score: 0,
  }
}

function dualLaneRun(taskId: string, state: string) {
  return {
    taskId,
    coordinatorId: "dual-coord",
    state,
    createdAt: "2026-06-24T10:00:00.000Z",
    updatedAt: "2026-06-24T10:01:00.000Z",
    baseCwd: "/tmp/repo",
    selectedLane: state === "selected" ? "openai" : null,
    archivedLane: null,
    lanes: [
      lane("openai"),
      lane("anthropic"),
    ],
    comparisonReport: {
      taskId,
      generatedAt: "2026-06-24T10:02:00.000Z",
      laneSummaries: [
        { laneId: "openai", changedFiles: ["src/a.ts"], addedLines: 2, removedLines: 0, status: "completed", error: null },
        { laneId: "anthropic", changedFiles: ["src/b.ts"], addedLines: 1, removedLines: 1, status: "completed", error: null },
      ],
      commonFiles: [],
      uniqueFiles: { openai: ["src/a.ts"], anthropic: ["src/b.ts"] },
      majorDifferences: ["Different files changed"],
    },
  } as OrchestrationDashboardData["dualLane"][number]
}

function lane(id: "openai" | "anthropic") {
  return {
    id,
    role: `${id}Implementer`,
    family: id,
    workerId: `${id}-worker`,
    leaseId: `${id}-lease`,
    sessionId: `${id}-session`,
    sessionStatus: "completed",
    sessionError: null,
    worktreePath: `/tmp/${id}`,
    archive: null,
  }
}

function activateTab(name: string) {
  const tab = screen.getByRole("tab", { name })
  fireEvent.pointerDown(tab, { button: 0, ctrlKey: false, pointerType: "mouse" })
  fireEvent.mouseDown(tab, { button: 0, ctrlKey: false })
  fireEvent.pointerUp(tab, { button: 0, ctrlKey: false, pointerType: "mouse" })
  fireEvent.mouseUp(tab, { button: 0, ctrlKey: false })
  fireEvent.click(tab)
}
