import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertTriangle, CircleSlash, RefreshCw, TerminalSquare } from "lucide-react"
import { api } from "@/lib/api"
import type {
  EngineLimitEngineSnapshot,
  EngineLimitsResponse,
  EngineLimitWindow,
} from "@/lib/api"
import { PageLayout, ToolbarActions } from "@/components/page-layout"
import { useBreadcrumbs } from "@/context/breadcrumb-context"
import { Skeleton } from "@/components/ui/skeleton"

// Engines we surface first when they have tracked usage; everything else follows
// alphabetically so newly-registered agents appear without a code change here.
const FEATURED_ENGINES = ["claude", "codex", "grok"]
const DANGER = 90

function formatDuration(minutes?: number) {
  if (!minutes) return ""
  if (minutes % 1440 === 0) return `${minutes / 1440}d`
  if (minutes % 60 === 0) return `${minutes / 60}h`
  return `${minutes}m`
}

function windowLabel(window: EngineLimitWindow) {
  return formatDuration(window.windowDurationMins) || window.name
}

function clampPercent(value?: number) {
  return Math.max(0, Math.min(100, value ?? 0))
}

function barColor(value?: number) {
  return (value ?? 0) >= DANGER ? "var(--system-red)" : "var(--accent)"
}

function resetLabel(iso?: string) {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return "resetting now"
  const mins = Math.round(diff / 60000)
  if (mins < 60) return `resets in ${mins}m`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `resets in ${hrs}h`
  const days = Math.round(hrs / 24)
  if (days <= 7) return `resets in ${days}d`
  return `resets ${new Date(iso).toLocaleDateString()}`
}

function agoLabel(iso?: string) {
  if (!iso) return "unknown"
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.max(0, Math.round(diff / 60000))
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

function freshness(engine: EngineLimitEngineSnapshot) {
  if (engine.status === "error") return { color: "var(--system-red)", label: "Error" }
  if (engine.stale) return { color: "var(--system-orange)", label: `Stale · ${agoLabel(engine.refreshedAt)}` }
  if (engine.status === "live") return { color: "var(--system-green)", label: "Live" }
  if (engine.status === "snapshot") return { color: "var(--text-tertiary)", label: `Updated ${agoLabel(engine.refreshedAt)}` }
  return { color: "var(--text-quaternary)", label: "No data" }
}

// ── classification ───────────────────────────────────────────────────────────
// Three distinct states the UI must reflect:
//   tracked   – CLI installed AND the provider exposes real usage numbers.
//   detected  – CLI installed, but no quota/usage statistics are available.
//   missing   – the CLI/agent was not found on PATH.
type EngineState = "tracked" | "detected" | "missing"

/** True when the snapshot carries observed usage numbers we can chart. */
function hasUsageStats(engine: EngineLimitEngineSnapshot): boolean {
  if (engine.windows?.some((w) => typeof w.usedPercent === "number")) return true
  const c = engine.credits
  if (c && (c.unlimited === true || typeof c.remainingPercent === "number" || !!c.balance)) return true
  if (typeof engine.context?.usedPercent === "number") return true
  return false
}

function classify(engine: EngineLimitEngineSnapshot): EngineState {
  if (!engine.available) return "missing"
  return hasUsageStats(engine) ? "tracked" : "detected"
}

/** Featured engines first (in declared order), then the rest alphabetically. */
function orderEngines(engines: EngineLimitEngineSnapshot[]): EngineLimitEngineSnapshot[] {
  const rank = (name: string) => {
    const i = FEATURED_ENGINES.indexOf(name)
    return i === -1 ? FEATURED_ENGINES.length : i
  }
  return [...engines].sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name))
}

function WindowBar({ window }: { window: EngineLimitWindow }) {
  const observed = window.usedPercent !== undefined
  const used = clampPercent(window.usedPercent)
  const reset = resetLabel(window.resetsAtIso)

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-[var(--space-3)]">
        <span className="text-[length:var(--text-footnote)] text-[var(--text-secondary)]">
          {windowLabel(window)} window
        </span>
        <span className="text-[length:var(--text-body)] font-[var(--weight-bold)] text-[var(--text-primary)] tabular-nums">
          {observed ? `${window.usedPercent}%` : "—"}
        </span>
      </div>
      <div className="mt-[var(--space-2)] h-2 rounded-full bg-[var(--fill-tertiary)] overflow-hidden">
        {observed && (
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-[var(--ease-smooth)]"
            style={{ width: `${used}%`, background: barColor(window.usedPercent) }}
          />
        )}
      </div>
      {reset && (
        <div className="mt-[var(--space-2)] text-[length:var(--text-caption1)] text-[var(--text-tertiary)]">{reset}</div>
      )}
    </div>
  )
}

function CardShell({
  name,
  plan,
  pill,
  children,
}: {
  name: string
  plan?: string
  pill: { color: string; label: string }
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[var(--radius-lg)] bg-[var(--bg-secondary)] border border-[var(--separator)] p-[var(--space-6)]">
      <div className="flex items-center justify-between gap-[var(--space-3)]">
        <div className="flex items-center gap-[var(--space-3)] min-w-0">
          <h2 className="text-[length:var(--text-body)] font-[var(--weight-semibold)] text-[var(--text-primary)] capitalize truncate">
            {name}
          </h2>
          {plan && (
            <span className="text-[length:var(--text-caption1)] text-[var(--text-tertiary)] truncate">{plan}</span>
          )}
        </div>
        <span className="flex items-center gap-[var(--space-2)] text-[length:var(--text-caption1)] text-[var(--text-secondary)] whitespace-nowrap">
          <span className="w-2 h-2 rounded-full" style={{ background: pill.color }} />
          {pill.label}
        </span>
      </div>
      {children}
    </section>
  )
}

/** Available agent with observed quota/usage numbers. */
function UsageCard({ engine }: { engine: EngineLimitEngineSnapshot }) {
  const windows = engine.windows || []
  const tone = freshness(engine)
  const credits = engine.credits
  const creditLabel = credits?.unlimited
    ? "Unlimited credits"
    : credits?.balance
      ? `Credits ${credits.balance}`
      : null
  const note = engine.error || (engine.stale ? "Snapshot is over 30 minutes old — may be out of date." : null)

  return (
    <CardShell name={engine.name} plan={engine.accountPlan} pill={tone}>
      {windows.length > 0 ? (
        <div className="mt-[var(--space-6)] grid gap-[var(--space-5)]">
          {windows.map((window) => (
            <WindowBar key={`${engine.name}-${window.name}`} window={window} />
          ))}
        </div>
      ) : (
        <div className="mt-[var(--space-6)] text-[length:var(--text-footnote)] text-[var(--text-tertiary)]">
          No quota windows observed yet.
        </div>
      )}

      {creditLabel && (
        <div className="mt-[var(--space-5)] text-[length:var(--text-footnote)] text-[var(--text-secondary)]">
          {creditLabel}
        </div>
      )}

      {note && (
        <div className="mt-[var(--space-5)] flex items-start gap-[var(--space-2)] text-[length:var(--text-footnote)] text-[var(--text-secondary)]">
          <AlertTriangle size={14} className="mt-[2px] flex-shrink-0" style={{ color: tone.color }} />
          <span>{note}</span>
        </div>
      )}
    </CardShell>
  )
}

/** Available agent whose provider exposes no usage statistics. */
function DetectedCard({ engine }: { engine: EngineLimitEngineSnapshot }) {
  return (
    <CardShell
      name={engine.name}
      plan={engine.accountPlan}
      pill={{ color: "var(--system-green)", label: "CLI detected" }}
    >
      <div className="mt-[var(--space-5)] flex items-start gap-[var(--space-2)]">
        <TerminalSquare size={15} className="mt-[1px] flex-shrink-0 text-[var(--text-tertiary)]" />
        <div className="min-w-0">
          <p className="text-[length:var(--text-footnote)] text-[var(--text-secondary)]">
            CLI detected — no usage statistics available for this agent.
          </p>
          {engine.unsupportedReason && (
            <p className="mt-[var(--space-2)] text-[length:var(--text-caption1)] text-[var(--text-tertiary)]">
              {engine.unsupportedReason}
            </p>
          )}
        </div>
      </div>
    </CardShell>
  )
}

/** The agent's CLI was not found on PATH. */
function UnavailableCard({ engine }: { engine: EngineLimitEngineSnapshot }) {
  return (
    <CardShell
      name={engine.name}
      pill={{ color: "var(--text-quaternary)", label: "Not available" }}
    >
      <div className="mt-[var(--space-5)] flex items-start gap-[var(--space-2)]">
        <CircleSlash size={15} className="mt-[1px] flex-shrink-0 text-[var(--text-quaternary)]" />
        <div className="min-w-0">
          <p className="text-[length:var(--text-footnote)] text-[var(--text-secondary)]">
            Agent not available — its CLI was not detected.
          </p>
          {engine.unsupportedReason && (
            <p className="mt-[var(--space-2)] text-[length:var(--text-caption1)] text-[var(--text-tertiary)]">
              {engine.unsupportedReason}
            </p>
          )}
        </div>
      </div>
    </CardShell>
  )
}

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-[var(--space-4)] flex items-baseline gap-[var(--space-3)]">
      <h2 className="text-[length:var(--text-footnote)] font-[var(--weight-semibold)] uppercase tracking-wide text-[var(--text-tertiary)]">
        {title}
      </h2>
      {hint && <span className="text-[length:var(--text-caption1)] text-[var(--text-quaternary)]">{hint}</span>}
    </div>
  )
}

export default function LimitsPage() {
  useBreadcrumbs([{ label: "Limits" }])
  const [data, setData] = useState<EngineLimitsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setRefreshing(true)
    setError(null)
    api
      .refreshEngineLimits()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load engine limits"))
      .finally(() => {
        setLoading(false)
        setRefreshing(false)
      })
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const groups = useMemo(() => {
    const all = orderEngines(Object.values(data?.engines ?? {}))
    return {
      tracked: all.filter((e) => classify(e) === "tracked"),
      detected: all.filter((e) => classify(e) === "detected"),
      missing: all.filter((e) => classify(e) === "missing"),
      total: all.length,
    }
  }, [data])

  const availableCount = groups.tracked.length + groups.detected.length

  return (
    <PageLayout>
      <div className="h-full flex flex-col overflow-hidden animate-fade-in bg-[var(--bg)]">
        <header
          className="sticky top-0 z-10 flex-shrink-0 bg-[var(--material-regular)] border-b border-[var(--separator)]"
          style={{
            backdropFilter: "blur(40px) saturate(180%)",
            WebkitBackdropFilter: "blur(40px) saturate(180%)",
          }}
        >
          <div className="flex items-center justify-between px-[var(--space-6)] py-[var(--space-3)]">
            <h1 className="text-[length:var(--text-subheadline)] font-[var(--weight-semibold)] text-[var(--text-primary)]">
              Limits
            </h1>
            <ToolbarActions>
              <button
                onClick={refresh}
                className="focus-ring w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] border-none bg-transparent text-[var(--text-tertiary)] cursor-pointer transition-colors duration-150 ease-[var(--ease-smooth)]"
                aria-label="Refresh engine limits"
              >
                <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              </button>
            </ToolbarActions>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-[var(--space-6)] pt-[var(--space-5)] pb-[var(--space-8)]">
          <div className="max-w-[920px] mx-auto">
            {error && (
              <div className="mb-[var(--space-5)] px-[var(--space-4)] py-[var(--space-3)] rounded-[var(--radius-md)] border border-[var(--system-red)] text-[length:var(--text-footnote)] text-[var(--system-red)]">
                {error}
              </div>
            )}

            {loading ? (
              <div className="grid gap-[var(--space-4)] md:grid-cols-2">
                <Skeleton height={180} className="rounded-[var(--radius-lg)]" />
                <Skeleton height={180} className="rounded-[var(--radius-lg)]" />
              </div>
            ) : (
              <div className="space-y-[var(--space-8)]">
                {groups.total > 0 && (
                  <p className="text-[length:var(--text-footnote)] text-[var(--text-tertiary)]">
                    {availableCount} of {groups.total} supported {groups.total === 1 ? "agent" : "agents"} detected
                    {groups.tracked.length > 0 && ` · ${groups.tracked.length} with usage statistics`}.
                  </p>
                )}

                {groups.tracked.length > 0 && (
                  <section>
                    <SectionHeader title="Tracked usage" hint="live quota & limits" />
                    <div className="grid gap-[var(--space-4)] md:grid-cols-2 items-start">
                      {groups.tracked.map((engine) => (
                        <UsageCard key={engine.name} engine={engine} />
                      ))}
                    </div>
                  </section>
                )}

                {groups.detected.length > 0 && (
                  <section>
                    <SectionHeader title="Detected" hint="installed, no usage statistics" />
                    <div className="grid gap-[var(--space-4)] md:grid-cols-2 items-start">
                      {groups.detected.map((engine) => (
                        <DetectedCard key={engine.name} engine={engine} />
                      ))}
                    </div>
                  </section>
                )}

                {groups.missing.length > 0 && (
                  <section>
                    <SectionHeader title="Not available" hint="CLI not detected" />
                    <div className="grid gap-[var(--space-4)] md:grid-cols-2 items-start">
                      {groups.missing.map((engine) => (
                        <UnavailableCard key={engine.name} engine={engine} />
                      ))}
                    </div>
                  </section>
                )}

                {groups.total === 0 && (
                  <div className="text-[length:var(--text-footnote)] text-[var(--text-tertiary)]">
                    No supported agents found.
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </PageLayout>
  )
}
