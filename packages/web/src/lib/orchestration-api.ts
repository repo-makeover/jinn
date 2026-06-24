const BASE =
  typeof window !== "undefined"
    ? window.location.origin
    : "http://127.0.0.1:7777"

export interface OrchestrationStatus {
  enabled: boolean
  runtimeBound: boolean
  degraded: boolean
  disabledReason: string | null
  degradedReason: string | null
  counts: {
    workers: number
    runningLeases: number
    queueItems: number
    allocations: number
    continuations: number
    activeWork: boolean
  }
}

export interface WorkerSummary {
  id: string
  provider: string
  family: string
  tier: string
  capabilities: string[]
  tools: string[]
  maxConcurrentTasks: number
  costClass: string
  workspacePolicy: string
}

export interface LeaseSummary {
  leaseId: string
  taskId: string
  coordinatorId: string
  workerId: string
  role: string
  state: string
  leaseExpiresAt?: string
}

export interface QueueSummary {
  taskId: string
  coordinatorId: string
  missingRoles?: string[]
  priority?: string
  state?: string
  reason?: string
}

export interface AllocationSummary {
  allocationId: string
  taskId: string
  coordinatorId: string
  state: string
  createdAt?: string
}

export interface ContinuationSummary {
  taskId: string
  coordinatorId: string
  mode: string
  state: string
  retryCount: number
  updatedAt: string
  allocationId?: string | null
  lastError?: string | null
}

export interface TelemetryBucket {
  count: number
  dispositions: Record<string, number>
  totalCost: number
  avgCost: number | null
  totalLatencyMs: number
  avgLatencyMs: number | null
  totalTokens: number
  avgTokens: number | null
  filesChanged: number
  testsAdded: number
  testsPassed: number
  reviewBlockers: number
  humanEdits: number
  regressions: number
  score: number
}

export interface TelemetrySummaryResponse {
  maxBytes: number
  maxRecords: number
  summary: {
    totals: TelemetryBucket
    byProvider: Record<string, TelemetryBucket>
    byFamily: Record<string, TelemetryBucket>
    byRole: Record<string, TelemetryBucket>
    byWorker: Record<string, TelemetryBucket>
    skippedLines: number
  }
}

export interface WorktreeSummary {
  taskId: string
  lane: string
  path: string
  baseCwd: string
  gitRoot: string
  branch: string
  createdAt: string
}

export interface DualLaneSummary {
  taskId: string
  coordinatorId: string
  state: "selection_required" | "selected" | "failed" | string
  createdAt: string
  updatedAt: string
  baseCwd: string
  selectedLane: "openai" | "anthropic" | null
  archivedLane: "openai" | "anthropic" | null
  lanes: Array<{
    id: "openai" | "anthropic"
    role: string
    family: string
    workerId: string
    leaseId: string
    sessionId: string
    sessionStatus: string
    sessionError: string | null
    worktreePath: string
    archive: { diffPath: string; metadataPath: string; archivedAt: string } | null
  }>
  comparisonReport: {
    taskId: string
    generatedAt: string
    laneSummaries: Array<{
      laneId: "openai" | "anthropic"
      changedFiles: string[]
      addedLines: number
      removedLines: number
      status: string
      error: string | null
    }>
    commonFiles: string[]
    uniqueFiles: Record<"openai" | "anthropic", string[]>
    majorDifferences: string[]
  }
}

export interface OrchestrationDashboardData {
  status: OrchestrationStatus
  workers: WorkerSummary[]
  leases: LeaseSummary[]
  queue: QueueSummary[]
  allocations: AllocationSummary[]
  continuations: ContinuationSummary[]
  telemetry: TelemetrySummaryResponse
  worktrees: WorktreeSummary[]
  dualLane: DualLaneSummary[]
}

async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json()
    if (body.error) return String(body.error)
    if (body.message) return String(body.message)
  } catch {
    // Response was not JSON.
  }
  return `API error: ${res.status}`
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: "include" })
  if (!res.ok) throw new Error(await extractErrorMessage(res))
  return res.json()
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await extractErrorMessage(res))
  return res.json()
}

export async function loadOrchestrationDashboard(): Promise<OrchestrationDashboardData> {
  const [
    status,
    workers,
    leases,
    queue,
    allocations,
    continuations,
    telemetry,
    worktrees,
    dualLane,
  ] = await Promise.all([
    get<OrchestrationStatus>("/api/orchestration/status"),
    get<{ workers: WorkerSummary[] }>("/api/orchestration/workers"),
    get<{ leases: LeaseSummary[] }>("/api/orchestration/leases"),
    get<{ queue: QueueSummary[] }>("/api/orchestration/queue"),
    get<{ allocations: AllocationSummary[] }>("/api/orchestration/allocations"),
    get<{ continuations: ContinuationSummary[] }>("/api/orchestration/continuations"),
    get<TelemetrySummaryResponse>("/api/orchestration/telemetry/summary"),
    get<{ worktrees: WorktreeSummary[] }>("/api/orchestration/worktrees"),
    get<{ manifests: DualLaneSummary[] }>("/api/orchestration/dual-lane"),
  ])

  return {
    status,
    workers: workers.workers,
    leases: leases.leases,
    queue: queue.queue,
    allocations: allocations.allocations,
    continuations: continuations.continuations,
    telemetry,
    worktrees: worktrees.worktrees,
    dualLane: dualLane.manifests,
  }
}

export async function retryContinuation(taskId: string, coordinatorId: string) {
  return post("/api/orchestration/continuations/retry", { taskId, coordinatorId })
}

export async function selectDualLaneWinner(taskId: string, winnerLane: "openai" | "anthropic") {
  return post("/api/orchestration/dual-lane/select", { taskId, winnerLane })
}
