/**
 * Jinn Talk — WorkDock (single graph-driven work rail).
 *
 * A vertical rail on the right edge, vertically centered. One chip per depth-1
 * delegation-graph node (the COO threads): a hue dot (solid = owned child;
 * hollow dashed ring + ⇄ glyph = an attachment soft-link), a topic label, a
 * status treatment (running pulses; idle/done dim; error tints red), and a row
 * of mini-dots for its depth-2+ employee descendants (working ones pulse).
 *
 * Tapping a chip opens its read-only child-session chat (the existing modal). A
 * ⋯ menu exposes Rename (inline), Dismiss (tombstone), and Pin-as-route-target
 * (the next user message continues that COO thread — the old ThreadPanel route
 * pin, preserved via the separate `targetThreadId`). When nothing is running and
 * the conversation is idle the rail collapses to bare dots; it expands on hover
 * or whenever anything is working. Replaces the constellation + thread panel.
 *
 * Reads the graph directly (graph-store is the single source); `sideState`
 * layers user renames/dismissals on top. Ledger-themed (light + dark via
 * tokens). The positioning wrapper is pointer-events:none so the orb stays
 * tappable through the margins; the rail re-enables pointer-events on itself.
 */
import { useEffect, useRef, useState } from "react"
import { MoreHorizontal, Pencil, X, Target, ArrowLeftRight } from "lucide-react"
import type { GraphNode } from "./graph-store"
import { isWorking } from "./graph-store"
import {
  orderDockNodes,
  miniDotsFor,
  nodeHue,
  deriveLabel,
  type DockSideMap,
} from "./work-dock-layout"
import "./work-dock.css"

export interface WorkDockProps {
  /** Full delegation graph (depth-1 = COO threads, depth-2+ = employees). */
  graph: GraphNode[]
  /** User side-state (rename overrides + dismiss tombstones). */
  sideState: DockSideMap
  /** The node the next user message routes to continue (null → new thread). */
  targetThreadId: string | null
  /** Open the read-only child-session chat modal. */
  onOpenThread: (id: string) => void
  /** Set/clear the route target (null → next message starts a new thread). */
  onSelectTarget: (id: string | null) => void
  /** Persist a user rename (label override). */
  onRename: (id: string, label: string) => void
  /** Tombstone a chip (does not kill the gateway session). */
  onDismiss: (id: string) => void
  /** Conversation is idle → allow the rail to collapse when nothing runs. */
  idle?: boolean
}

/** A node's display label: a user override wins over the server label. */
function labelFor(node: GraphNode, side: DockSideMap): string {
  const override = side.get(node.id)?.labelOverride
  return override ? deriveLabel(override) : deriveLabel(node.label || node.id)
}

function statusKind(node: GraphNode): "running" | "error" | "idle" {
  if (node.status === "error" || node.status === "failed") return "error"
  if (isWorking(node)) return "running"
  return "idle"
}

export function WorkDock({
  graph,
  sideState,
  targetThreadId,
  onOpenThread,
  onSelectTarget,
  onRename,
  onDismiss,
  idle = false,
}: WorkDockProps) {
  const { shown, overflow } = orderDockNodes(graph, sideState)

  const [menuId, setMenuId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")

  // Close the ⋯ menu on an outside click.
  const rootRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!menuId) return
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setMenuId(null)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [menuId])

  if (shown.length === 0) return null

  // Collapse to bare dots only when the conversation is idle AND nothing is
  // working; any running node (or hover, via CSS) expands the rail to labels.
  const anyWorking = shown.some((n) => isWorking(n))
  const collapsed = idle && !anyWorking

  const startEdit = (node: GraphNode) => {
    setMenuId(null)
    setEditingId(node.id)
    setDraft(labelFor(node, sideState))
  }
  const commitEdit = () => {
    if (editingId && draft.trim()) onRename(editingId, draft.trim())
    setEditingId(null)
  }

  return (
    <div className="wd-wrap">
      <div
        ref={rootRef}
        className="wd"
        data-collapsed={collapsed}
        role="list"
        aria-label={`Work rail (${shown.length})`}
      >
        {shown.map((node) => {
          const hue = sideState.get(node.id)?.hue ?? nodeHue(node)
          const kind = statusKind(node)
          const label = labelFor(node, sideState)
          const attached = node.attached === true
          const pinned = node.id === targetThreadId
          const dots = miniDotsFor(node.id, graph)
          const editing = editingId === node.id
          const openLabel = `Open conversation: ${label}`
          return (
            <div
              key={node.id}
              role="listitem"
              className="wd__item"
              style={{ ["--wd-hue" as string]: String(hue) }}
              data-status={kind}
              data-attached={attached}
              data-pinned={pinned}
            >
              <div className="wd__chip">
                <span
                  className={`wd__dot${kind === "running" ? " wd__dot--running" : ""}${attached ? " wd__dot--attached" : ""}`}
                  aria-hidden="true"
                >
                  {attached && <ArrowLeftRight size={8} className="wd__attach-glyph" />}
                </span>

                {editing ? (
                  <input
                    className="wd__edit"
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit()
                      else if (e.key === "Escape") setEditingId(null)
                    }}
                    aria-label="Rename thread"
                  />
                ) : (
                  <button
                    className="wd__label"
                    onClick={() => onOpenThread(node.id)}
                    aria-label={openLabel}
                    title={openLabel}
                  >
                    {label}
                  </button>
                )}

                {pinned && !editing && (
                  <Target size={11} className="wd__pin" aria-label="Route target" />
                )}

                {!editing && (
                  <button
                    className="wd__more"
                    aria-label={`Actions for ${label}`}
                    aria-haspopup="menu"
                    aria-expanded={menuId === node.id}
                    onClick={() => setMenuId((cur) => (cur === node.id ? null : node.id))}
                  >
                    <MoreHorizontal size={14} />
                  </button>
                )}
              </div>

              {dots.length > 0 && (
                <div className="wd__minis" aria-label={`${dots.length} sub-agents`}>
                  {dots.map((d) => (
                    <button
                      key={d.id}
                      className={`wd__mini${d.working ? " wd__mini--working" : ""}`}
                      aria-label={`Open sub-agent ${d.id}`}
                      title={d.id}
                      style={{
                        background: `hsl(${hue} 64% ${d.working ? 62 : 38}%)`,
                      }}
                      onClick={() => onOpenThread(d.id)}
                    />
                  ))}
                </div>
              )}

              {menuId === node.id && (
                <div className="wd__menu" role="menu">
                  <button
                    role="menuitem"
                    className="wd__menu-item"
                    data-active={pinned}
                    onClick={() => {
                      onSelectTarget(pinned ? null : node.id)
                      setMenuId(null)
                    }}
                  >
                    <Target size={13} />
                    {pinned ? "Unpin route target" : "Pin as route target"}
                  </button>
                  <button
                    role="menuitem"
                    className="wd__menu-item"
                    onClick={() => startEdit(node)}
                  >
                    <Pencil size={13} /> Rename
                  </button>
                  <button
                    role="menuitem"
                    className="wd__menu-item"
                    onClick={() => {
                      onDismiss(node.id)
                      setMenuId(null)
                    }}
                  >
                    <X size={13} /> Dismiss
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {overflow > 0 && (
          <div className="wd__overflow" role="listitem" aria-label={`${overflow} more`}>
            +{overflow}
          </div>
        )}
      </div>
    </div>
  )
}
