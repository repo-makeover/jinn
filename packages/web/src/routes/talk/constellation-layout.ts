/**
 * Jinn Talk — pure constellation layout helpers (Mission Control).
 *
 * Satellites never auto-hide: every COO thread renders (idle = dimmed), capped
 * for layout sanity with an explicit overflow count. Each satellite can carry a
 * row of mini-dots — its depth-2+ descendants (employees a COO dispatched).
 */
import type { TalkThread } from "./thread-store"
import type { GraphNode } from "./graph-store"
import { isWorking } from "./graph-store"

export const MAX_SATELLITES = 8
export const MAX_MINI_DOTS = 6

/** All threads, working-first then newest-first, capped with overflow count. */
export function visibleThreads(threads: TalkThread[]): { shown: TalkThread[]; overflow: number } {
  const sorted = [...threads].sort((a, b) => {
    const aw = a.state !== "idle" ? 1 : 0
    const bw = b.state !== "idle" ? 1 : 0
    if (aw !== bw) return bw - aw
    return b.ts - a.ts
  })
  return { shown: sorted.slice(0, MAX_SATELLITES), overflow: Math.max(0, sorted.length - MAX_SATELLITES) }
}

/** Depth-2+ descendants of a COO thread (its employee sub-sessions), capped. */
export function miniDotsFor(nodes: GraphNode[], threadId: string): GraphNode[] {
  const subtree: GraphNode[] = []
  const frontier = new Set<string>([threadId])
  let grew = true
  while (grew) {
    grew = false
    for (const x of nodes) {
      if (x.parentId && frontier.has(x.parentId) && !frontier.has(x.id)) {
        frontier.add(x.id)
        subtree.push(x)
        grew = true
      }
    }
  }
  return subtree
    .sort((a, b) => (isWorking(b) ? 1 : 0) - (isWorking(a) ? 1 : 0))
    .slice(0, MAX_MINI_DOTS)
}
