import { Link } from 'react-router-dom'
import { Check, X, ShieldQuestion, ArrowRight } from 'lucide-react'
import { PageLayout } from '@/components/page-layout'
import { useBreadcrumbs } from '@/context/breadcrumb-context'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useApprovals, useApproveApproval, useRejectApproval } from '@/hooks/use-approvals'
import type { Approval } from '@/lib/api'

function fallbackSummary(payload: Record<string, unknown>): { from: string; to: string; reason?: string } {
  const from = payload.from as { engine?: string; model?: string } | undefined
  const to = payload.to as { engine?: string; model?: string } | undefined
  const fmt = (e?: { engine?: string; model?: string }) =>
    e ? `${e.engine ?? '?'}${e.model ? `/${e.model}` : ''}` : '?'
  return { from: fmt(from), to: fmt(to), reason: typeof payload.reason === 'string' ? payload.reason : undefined }
}

function ApprovalCard({ approval }: { approval: Approval }) {
  const approve = useApproveApproval()
  const reject = useRejectApproval()
  const busy = approve.isPending || reject.isPending
  const { from, to, reason } = fallbackSummary(approval.payload)

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm">
        <ShieldQuestion className="size-4 text-amber-500" />
        <span className="font-medium capitalize">{approval.type} approval</span>
        {reason && (
          <span className="text-xs rounded bg-muted px-1.5 py-0.5 text-muted-foreground">{reason}</span>
        )}
      </div>

      {approval.type === 'fallback' && (
        <div className="flex items-center gap-2 text-sm font-mono">
          <span className="text-muted-foreground">{from}</span>
          <ArrowRight className="size-3.5" />
          <span className="text-foreground">{to}</span>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Session{' '}
        <Link to={`/?session=${approval.sessionId}`} className="underline hover:text-foreground">
          {approval.sessionId.slice(0, 8)}
        </Link>{' '}
        · {new Date(approval.createdAt).toLocaleString()}
      </div>

      {(approve.error || reject.error) && (
        <div className="text-xs text-destructive">
          {(approve.error as Error)?.message || (reject.error as Error)?.message}
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={() => approve.mutate(approval.id)}>
          <Check className="size-3.5" /> Approve &amp; resume
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => reject.mutate(approval.id)}>
          <X className="size-3.5" /> Reject
        </Button>
      </div>
    </div>
  )
}

export default function ApprovalsPage() {
  useBreadcrumbs([{ label: 'Approvals' }])
  const { data: approvals, isLoading } = useApprovals('pending')

  return (
    <PageLayout>
      <div className="mx-auto w-full max-w-2xl p-4 sm:p-6 flex flex-col gap-4">
        <div>
          <h1 className="text-lg font-semibold">Approvals</h1>
          <p className="text-sm text-muted-foreground">
            Sessions waiting on a human decision (e.g. a model fallback after a rate limit). Approving
            resumes the session on the fallback engine; rejecting stops it — surfaced, not silently stalled.
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : !approvals || approvals.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No pending approvals.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {approvals.map((a) => (
              <ApprovalCard key={a.id} approval={a} />
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
