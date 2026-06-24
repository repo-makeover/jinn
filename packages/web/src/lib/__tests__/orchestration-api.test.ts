import { afterEach, describe, expect, it, vi } from "vitest"
import {
  loadOrchestrationDashboard,
  retryContinuation,
  selectDualLaneWinner,
} from "../orchestration-api"

afterEach(() => {
  vi.restoreAllMocks()
})

describe("orchestration-api", () => {
  it("loads every dashboard endpoint and normalizes payload containers", async () => {
    const fetchMock = vi.fn(async (url: string) => ok(payloadFor(url)))
    vi.stubGlobal("fetch", fetchMock)

    const data = await loadOrchestrationDashboard()

    expect(fetchMock).toHaveBeenCalledTimes(9)
    expect(data.status.enabled).toBe(true)
    expect(data.workers).toEqual([{ id: "worker-1" }])
    expect(data.leases).toEqual([{ leaseId: "lease-1" }])
    expect(data.queue).toEqual([])
    expect(data.dualLane).toEqual([{ taskId: "dual-1" }])
  })

  it("surfaces API errors from JSON bodies", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 409,
      json: async () => ({ error: "orchestration is disabled" }),
    })))

    await expect(loadOrchestrationDashboard()).rejects.toThrow("orchestration is disabled")
  })

  it("posts retry and dual-lane selection actions", async () => {
    const fetchMock = vi.fn(async () => ok({ ok: true }))
    vi.stubGlobal("fetch", fetchMock)

    await retryContinuation("task-1", "coord-1")
    await selectDualLaneWinner("task-2", "openai")

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/orchestration/continuations/retry"), expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ taskId: "task-1", coordinatorId: "coord-1" }),
    }))
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/orchestration/dual-lane/select"), expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ taskId: "task-2", winnerLane: "openai" }),
    }))
  })
})

function ok(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response
}

function payloadFor(url: string) {
  if (url.endsWith("/status")) {
    return {
      enabled: true,
      runtimeBound: true,
      degraded: false,
      disabledReason: null,
      degradedReason: null,
      counts: { workers: 1, runningLeases: 0, queueItems: 0, allocations: 0, continuations: 0, activeWork: false },
    }
  }
  if (url.endsWith("/workers")) return { workers: [{ id: "worker-1" }] }
  if (url.endsWith("/leases")) return { leases: [{ leaseId: "lease-1" }] }
  if (url.endsWith("/queue")) return { queue: [] }
  if (url.endsWith("/allocations")) return { allocations: [] }
  if (url.endsWith("/continuations")) return { continuations: [] }
  if (url.endsWith("/telemetry/summary")) {
    return {
      maxBytes: 100,
      maxRecords: 10,
      summary: {
        totals: { count: 0, dispositions: {}, totalCost: 0, avgCost: null, totalLatencyMs: 0, avgLatencyMs: null, totalTokens: 0, avgTokens: null, filesChanged: 0, testsAdded: 0, testsPassed: 0, reviewBlockers: 0, humanEdits: 0, regressions: 0, score: 0 },
        byProvider: {},
        byFamily: {},
        byRole: {},
        byWorker: {},
        skippedLines: 0,
      },
    }
  }
  if (url.endsWith("/worktrees")) return { worktrees: [] }
  if (url.endsWith("/dual-lane")) return { manifests: [{ taskId: "dual-1" }] }
  throw new Error(`unexpected url ${url}`)
}
