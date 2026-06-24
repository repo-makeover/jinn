import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { AlertTriangle, CheckCircle2, GitBranch, Network, RefreshCw, RotateCcw } from "lucide-react"
import { PageLayout, ToolbarActions } from "@/components/page-layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useBreadcrumbs } from "@/context/breadcrumb-context"
import {
  loadOrchestrationDashboard,
  retryContinuation,
  selectDualLaneWinner,
  type ContinuationSummary,
  type DualLaneSummary,
  type OrchestrationDashboardData,
} from "@/lib/orchestration-api"

const TABS = ["Overview", "Workers", "Queue", "Continuations", "Dual-lane", "Worktrees", "Telemetry"] as const

export default function OrchestrationPage() {
  useBreadcrumbs([{ label: "Orchestration" }])
  const [data, setData] = useState<OrchestrationDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionKey, setActionKey] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const refresh = useCallback(async () => {
    setRefreshing(true)
    setError(null)
    try {
      setData(await loadOrchestrationDashboard())
      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orchestration state")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const failedContinuations = useMemo(
    () => data?.continuations.filter((entry) => entry.state === "failed") ?? [],
    [data],
  )
  const selectableRuns = useMemo(
    () => data?.dualLane.filter((entry) => entry.state === "selection_required") ?? [],
    [data],
  )

  async function runAction(key: string, action: () => Promise<unknown>) {
    setActionKey(key)
    setActionError(null)
    try {
      await action()
      await refresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed")
    } finally {
      setActionKey(null)
    }
  }

  return (
    <PageLayout>
      <div className="h-full flex flex-col overflow-hidden bg-[var(--bg)]">
        <header className="sticky top-0 z-10 flex-shrink-0 bg-[var(--material-regular)] border-b border-[var(--separator)]">
          <div className="flex items-center justify-between gap-[var(--space-4)] px-[var(--space-6)] py-[var(--space-4)]">
            <div className="min-w-0">
              <h1 className="text-[length:var(--text-title1)] font-[var(--weight-bold)] text-[var(--text-primary)] leading-[var(--leading-tight)]">
                Orchestration
              </h1>
              <p className="text-[length:var(--text-footnote)] text-[var(--text-secondary)] mt-[var(--space-1)]">
                {statusText(data)}
              </p>
            </div>
            <ToolbarActions>
              <div className="flex items-center gap-[var(--space-3)]">
                {lastRefresh && (
                  <span className="text-[length:var(--text-caption1)] text-[var(--text-tertiary)]">
                    Updated {lastRefresh.toLocaleTimeString()}
                  </span>
                )}
                <button
                  onClick={() => void refresh()}
                  className="focus-ring w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] border border-[var(--separator)] bg-[var(--material-thin)] text-[var(--text-secondary)]"
                  aria-label="Refresh orchestration"
                >
                  <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
                </button>
              </div>
            </ToolbarActions>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-[var(--space-6)] py-[var(--space-4)] min-h-0">
          {(error || actionError) && (
            <Banner tone="error" text={error ?? actionError ?? ""} />
          )}
          {loading ? (
            <EmptyState text="Loading orchestration state..." />
          ) : !data ? (
            <EmptyState text="No orchestration state available." />
          ) : (
            <Tabs defaultValue="Overview" className="gap-[var(--space-4)]">
              <TabsList className="flex flex-wrap h-auto justify-start bg-[var(--material-regular)] border border-[var(--separator)]">
                {TABS.map((tab) => (
                  <TabsTrigger key={tab} value={tab} className="min-h-8">
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="Overview">
                <Overview data={data} failedContinuations={failedContinuations.length} selectableRuns={selectableRuns.length} />
              </TabsContent>
              <TabsContent value="Workers">
                <Section title="Workers" count={data.workers.length}>
                  <Table
                    columns={["Worker", "Provider", "Family", "Tier", "Cost", "Workspace", "Capabilities"]}
                    rows={data.workers.map((worker) => [
                      worker.id,
                      worker.provider,
                      worker.family,
                      worker.tier,
                      worker.costClass,
                      worker.workspacePolicy,
                      worker.capabilities.join(", "),
                    ])}
                  />
                </Section>
              </TabsContent>
              <TabsContent value="Queue">
                <Section title="Queue" count={data.queue.length}>
                  <Table
                    columns={["Task", "Coordinator", "Priority", "Missing roles", "Reason"]}
                    rows={data.queue.map((item) => [
                      item.taskId,
                      item.coordinatorId,
                      item.priority ?? "-",
                      item.missingRoles?.join(", ") || "-",
                      item.reason ?? item.state ?? "-",
                    ])}
                    empty="No blocked queue items."
                  />
                </Section>
              </TabsContent>
              <TabsContent value="Continuations">
                <Section title="Continuations" count={data.continuations.length}>
                  <ContinuationList
                    continuations={data.continuations}
                    actionKey={actionKey}
                    onRetry={(entry) => runAction(
                      `retry:${entry.taskId}:${entry.coordinatorId}`,
                      () => retryContinuation(entry.taskId, entry.coordinatorId),
                    )}
                  />
                </Section>
              </TabsContent>
              <TabsContent value="Dual-lane">
                <Section title="Dual-lane selections" count={data.dualLane.length}>
                  <DualLaneList
                    runs={data.dualLane}
                    actionKey={actionKey}
                    onSelect={(run, lane) => runAction(
                      `select:${run.taskId}:${lane}`,
                      () => selectDualLaneWinner(run.taskId, lane),
                    )}
                  />
                </Section>
              </TabsContent>
              <TabsContent value="Worktrees">
                <Section title="Managed worktrees" count={data.worktrees.length}>
                  <Table
                    columns={["Task", "Lane", "Branch", "Path", "Created"]}
                    rows={data.worktrees.map((worktree) => [
                      worktree.taskId,
                      worktree.lane,
                      worktree.branch,
                      worktree.path,
                      formatDate(worktree.createdAt),
                    ])}
                    empty="No managed worktrees."
                  />
                </Section>
              </TabsContent>
              <TabsContent value="Telemetry">
                <Telemetry data={data} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </PageLayout>
  )
}

function Overview({ data, failedContinuations, selectableRuns }: {
  data: OrchestrationDashboardData
  failedContinuations: number
  selectableRuns: number
}) {
  const totalCost = data.telemetry.summary.totals.totalCost
  return (
    <div className="grid gap-[var(--space-4)]">
      {data.status.degradedReason && <Banner tone="warn" text={data.status.degradedReason} />}
      {data.status.disabledReason && <Banner tone="warn" text={data.status.disabledReason} />}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[var(--space-3)]">
        <Metric label="Workers" value={data.workers.length} icon={<Network size={16} />} />
        <Metric label="Running leases" value={data.status.counts.runningLeases} icon={<CheckCircle2 size={16} />} />
        <Metric label="Blocked queue" value={data.queue.length} tone={data.queue.length ? "warn" : undefined} icon={<AlertTriangle size={16} />} />
        <Metric label="Failed continuations" value={failedContinuations} tone={failedContinuations ? "error" : undefined} icon={<RotateCcw size={16} />} />
        <Metric label="Dual-lane choices" value={selectableRuns} tone={selectableRuns ? "warn" : undefined} icon={<GitBranch size={16} />} />
        <Metric label="Worktrees" value={data.worktrees.length} icon={<GitBranch size={16} />} />
        <Metric label="Telemetry runs" value={data.telemetry.summary.totals.count} />
        <Metric label="Recorded cost" value={`$${totalCost.toFixed(3)}`} />
      </div>
      <Section title="Running leases" count={data.leases.filter((lease) => lease.state === "running").length}>
        <Table
          columns={["Lease", "Task", "Worker", "Role", "Expires"]}
          rows={data.leases
            .filter((lease) => lease.state === "running")
            .map((lease) => [lease.leaseId, lease.taskId, lease.workerId, lease.role, formatDate(lease.leaseExpiresAt)])}
          empty="No running leases."
        />
      </Section>
    </div>
  )
}

function ContinuationList({ continuations, actionKey, onRetry }: {
  continuations: ContinuationSummary[]
  actionKey: string | null
  onRetry: (entry: ContinuationSummary) => void
}) {
  if (continuations.length === 0) return <EmptyState text="No durable continuations." />
  return (
    <div className="grid gap-[var(--space-2)]">
      {continuations.map((entry) => {
        const key = `retry:${entry.taskId}:${entry.coordinatorId}`
        const canRetry = entry.state === "failed"
        return (
          <Row key={`${entry.taskId}:${entry.coordinatorId}`}>
            <div className="min-w-0">
              <div className="font-[var(--weight-semibold)] text-[var(--text-primary)] truncate">{entry.taskId}</div>
              <div className="text-[length:var(--text-caption1)] text-[var(--text-tertiary)] truncate">
                {entry.coordinatorId} - {entry.mode} - updated {formatDate(entry.updatedAt)}
              </div>
              {entry.lastError && <div className="text-[length:var(--text-caption1)] text-[var(--system-red)] truncate">{entry.lastError}</div>}
            </div>
            <div className="flex items-center gap-[var(--space-2)] shrink-0">
              <Pill text={entry.state} tone={entry.state === "failed" ? "error" : "neutral"} />
              <button
                disabled={!canRetry || actionKey === key}
                title={canRetry ? "Retry failed continuation" : "Only failed continuations can be retried"}
                onClick={() => onRetry(entry)}
                className="focus-ring h-8 px-3 rounded-[var(--radius-sm)] border border-[var(--separator)] disabled:opacity-45 text-[length:var(--text-footnote)]"
              >
                Retry
              </button>
            </div>
          </Row>
        )
      })}
    </div>
  )
}

function DualLaneList({ runs, actionKey, onSelect }: {
  runs: DualLaneSummary[]
  actionKey: string | null
  onSelect: (run: DualLaneSummary, lane: "openai" | "anthropic") => void
}) {
  if (runs.length === 0) return <EmptyState text="No dual-lane manifests." />
  return (
    <div className="grid gap-[var(--space-2)]">
      {runs.map((run) => {
        const canSelect = run.state === "selection_required"
        return (
          <Row key={run.taskId}>
            <div className="min-w-0">
              <div className="font-[var(--weight-semibold)] text-[var(--text-primary)] truncate">{run.taskId}</div>
              <div className="text-[length:var(--text-caption1)] text-[var(--text-tertiary)]">
                {run.coordinatorId} - {run.lanes.map((lane) => `${lane.id}:${lane.sessionStatus}`).join(" / ")}
              </div>
              {run.comparisonReport.majorDifferences.length > 0 && (
                <div className="text-[length:var(--text-caption1)] text-[var(--text-secondary)] truncate">
                  {run.comparisonReport.majorDifferences.join("; ")}
                </div>
              )}
            </div>
            <div className="flex items-center gap-[var(--space-2)] shrink-0">
              <Pill text={run.state} tone={canSelect ? "warn" : "neutral"} />
              {run.lanes.map((lane) => (
                <button
                  key={lane.id}
                  disabled={!canSelect || actionKey === `select:${run.taskId}:${lane.id}`}
                  title={canSelect ? `Select ${lane.id} lane` : "Only selection_required manifests can be selected"}
                  onClick={() => onSelect(run, lane.id)}
                  className="focus-ring h-8 px-3 rounded-[var(--radius-sm)] border border-[var(--separator)] disabled:opacity-45 text-[length:var(--text-footnote)]"
                >
                  Select {lane.id}
                </button>
              ))}
            </div>
          </Row>
        )
      })}
    </div>
  )
}

function Telemetry({ data }: { data: OrchestrationDashboardData }) {
  const summary = data.telemetry.summary
  const providers = Object.entries(summary.byProvider)
  return (
    <Section title="Telemetry summary" count={summary.totals.count}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[var(--space-3)] mb-[var(--space-3)]">
        <Metric label="Runs" value={summary.totals.count} />
        <Metric label="Cost" value={`$${summary.totals.totalCost.toFixed(3)}`} />
        <Metric label="Avg latency" value={summary.totals.avgLatencyMs === null ? "-" : `${summary.totals.avgLatencyMs}ms`} />
        <Metric label="Skipped lines" value={summary.skippedLines} tone={summary.skippedLines ? "warn" : undefined} />
      </div>
      <Table
        columns={["Provider", "Runs", "Score", "Cost", "Failures"]}
        rows={providers.map(([provider, bucket]) => [
          provider,
          String(bucket.count),
          String(bucket.score),
          `$${bucket.totalCost.toFixed(3)}`,
          String(bucket.dispositions.failed ?? 0),
        ])}
        empty="No telemetry records."
      />
    </Section>
  )
}

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section className="grid gap-[var(--space-3)]">
      <div className="flex items-center justify-between">
        <h2 className="text-[length:var(--text-title3)] font-[var(--weight-semibold)] text-[var(--text-primary)]">{title}</h2>
        <span className="text-[length:var(--text-caption1)] text-[var(--text-tertiary)]">{count}</span>
      </div>
      {children}
    </section>
  )
}

function Table({ columns, rows, empty = "No rows." }: { columns: string[]; rows: string[][]; empty?: string }) {
  if (rows.length === 0) return <EmptyState text={empty} />
  return (
    <div className="overflow-x-auto border border-[var(--separator)] rounded-[var(--radius-md)] bg-[var(--material-thin)]">
      <table className="w-full text-left text-[length:var(--text-footnote)]">
        <thead className="text-[var(--text-tertiary)] bg-[var(--material-regular)]">
          <tr>{columns.map((column) => <th key={column} className="px-3 py-2 font-[var(--weight-semibold)] whitespace-nowrap">{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-[var(--separator)]">
              {row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-2 max-w-[28rem] truncate">{cell || "-"}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Row({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-[var(--space-3)] border border-[var(--separator)] rounded-[var(--radius-md)] bg-[var(--material-thin)] px-3 py-2">
      {children}
    </div>
  )
}

function Metric({ label, value, icon, tone }: { label: string; value: string | number; icon?: ReactNode; tone?: "warn" | "error" }) {
  const color = tone === "error" ? "var(--system-red)" : tone === "warn" ? "var(--system-orange)" : "var(--text-primary)"
  return (
    <div className="border border-[var(--separator)] rounded-[var(--radius-md)] bg-[var(--material-thin)] p-3">
      <div className="flex items-center gap-2 text-[length:var(--text-caption1)] text-[var(--text-tertiary)]">{icon}{label}</div>
      <div className="mt-1 text-[length:var(--text-title3)] font-[var(--weight-bold)]" style={{ color }}>{value}</div>
    </div>
  )
}

function Pill({ text, tone }: { text: string; tone: "neutral" | "warn" | "error" }) {
  const color = tone === "error" ? "var(--system-red)" : tone === "warn" ? "var(--system-orange)" : "var(--text-secondary)"
  return <span className="px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--material-regular)] text-[length:var(--text-caption1)]" style={{ color }}>{text}</span>
}

function Banner({ tone, text }: { tone: "warn" | "error"; text: string }) {
  return (
    <div className="mb-[var(--space-3)] px-3 py-2 rounded-[var(--radius-md)] border text-[length:var(--text-footnote)]"
      style={{
        color: tone === "error" ? "var(--system-red)" : "var(--system-orange)",
        borderColor: "var(--separator)",
        background: "var(--material-thin)",
      }}
    >
      {text}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div className="border border-dashed border-[var(--separator)] rounded-[var(--radius-md)] p-6 text-center text-[var(--text-tertiary)]">{text}</div>
}

function statusText(data: OrchestrationDashboardData | null): string {
  if (!data) return "Loading runtime state"
  if (!data.status.enabled) return "Disabled by gateway configuration"
  if (!data.status.runtimeBound) return "Enabled, runtime not bound"
  return `${data.status.counts.runningLeases} running lease(s), ${data.status.counts.queueItems} queued item(s)`
}

function formatDate(value: string | undefined): string {
  if (!value) return "-"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}
