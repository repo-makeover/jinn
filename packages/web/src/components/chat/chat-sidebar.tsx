
import React, { useEffect, useState, useRef, useCallback, useMemo, startTransition } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useQueryClient } from "@tanstack/react-query"
import { ChevronDown, Clock3, Copy, EllipsisVertical, Layers, Pencil, Pin, Plus, Search, Trash2, X } from "lucide-react"
import { api, type BackgroundActivity, type Employee, type SessionsResponse } from "@/lib/api"
import { useOrg } from "@/hooks/use-employees"
import { EmployeeAvatar } from "@/components/ui/employee-avatar"
import { useSettings } from "@/routes/settings-provider"
import { cleanPreview } from "@/lib/clean-preview"
import { queryKeys } from "@/lib/query-keys"
import { useSessions, useSessionCounts, useSessionSearch, useUpdateSession, useDeleteSession, useBulkDeleteSessions, useDuplicateSession } from "@/hooks/use-sessions"
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { mergeSidebarEmployees, bucketByDay, summarizeOlder, isFocusedSession } from "@/components/chat/chat-route-helpers"
import { groupSessionsByDepartment, roomSelectionId } from "@/lib/rooms/grouping"
import type { DepartmentRoom, RoomEmployee, RoomSession } from "@/lib/rooms/types"
import type { Session, SidebarOrder, FlatItem, FlatRow, ViewMode, StatusDotState } from "./sidebar-types"
import {
  loadExpandedRooms, saveExpandedRooms, getReadSessions, markSessionRead, markAllReadForEmployee,
  getPinnedSessions, savePinnedSessions, loadCollapsedState, saveCollapsedState,
  loadExpandedState, saveExpandedState,
} from "./sidebar-storage"
import {
  formatTime, titleCase, resolveRowIdentity, isCronSession, isDirectSession, isVisibleSource,
  getSessionActivity, sortSessionsByActivity, hasBackgroundActivity, isRecentError, getStatusDot,
} from "./sidebar-session-helpers"

// Compatibility facade: these moved to ./sidebar-types and ./sidebar-session-helpers
// (AS-001 modularization) — re-exported so existing importers of this module
// (chat/page.tsx, chat-sidebar-helpers.test.ts) keep working.
export type { SidebarOrder }
export { hasBackgroundActivity, isDirectSession, isRecentError, resolveRowIdentity }

// Server-side group sentinels — must match CRON_GROUP/DIRECT_GROUP in the
// backend registry (sessions are bounded per group; "load more" fetches the rest).
const DIRECT_GROUP = "__direct__"
const CRON_GROUP = "__cron__"

const OLDER_EXPANDED_STORAGE_KEY = "jinn-sidebar-older-expanded"
const FOCUS_MODE_STORAGE_KEY = "jinn-sidebar-focus-mode"

interface ChatSidebarProps {
  selectedId: string | null
  onSelect: (id: string) => void
  onNewChat: () => void
  onDelete?: (id: string) => void
  onDuplicate?: (newSessionId: string) => void
  onSessionsLoaded?: (sessions: Session[]) => void
  onEmployeeSessionsAvailable?: (sessions: Session[]) => void
  onOrderComputed?: (order: SidebarOrder) => void
  /** Start a new chat with a session-less roster employee (contactable list). */
  onContactEmployee?: (name: string) => void
  /** Open a department project-room's merged timeline (Rooms view-mode). */
  onSelectRoom?: (roomId: string) => void
}

function StatusDot({
  color,
  pulse = false,
  className,
  title,
}: {
  color: string
  pulse?: boolean
  className?: string
  title?: string
}) {
  return (
    <span
      className={cn("shrink-0 rounded-full", className)}
      title={title}
      role={title ? "img" : undefined}
      aria-label={title}
      style={{
        background: color,
        animation: pulse ? "sidebar-pulse 2s ease-in-out infinite" : "none",
        boxShadow: pulse ? `0 0 8px ${color}` : "none",
      }}
    />
  )
}

// One quiet, unified treatment for every sidebar section header
// (Today/Yesterday, Older, Scheduled, Team): muted medium label with light
// tracking and the count as a plain trailing number — no shouty uppercase, no
// filled chip. Keep these constants the single source so the headers can't drift.
const SECTION_LABEL_CLASS =
  "text-[11px] font-[var(--weight-medium)] tracking-[0.06em] text-[var(--text-tertiary)]"
const SECTION_COUNT_CLASS = "text-[10px] tabular-nums text-[var(--text-quaternary)]"

function SectionLabel({
  label,
  count,
}: {
  label: string
  count?: number
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <span className={SECTION_LABEL_CLASS}>{label}</span>
      {typeof count === "number" && (
        <span className={cn("ml-auto", SECTION_COUNT_CLASS)}>{count}</span>
      )}
    </div>
  )
}

interface SessionRowProps {
  session: Session
  parentSessions?: Session[]
  selectedId: string | null
  readSessions: Set<string>
  pinnedSessions: Set<string>
  renamingSessionId: string | null
  renameCancelledRef: React.MutableRefObject<boolean>
  fixTitle: (title: string | undefined, employee: string | undefined) => string
  onSelect: (id: string) => void
  onEmployeeSessionsAvailable?: (sessions: Session[]) => void
  togglePin: (pinKey: string) => void
  handleDuplicate: (sessionId: string) => void
  setDeleteTarget: (target: { type: "session" | "employee"; id: string; label: string; sessions?: Session[] } | null) => void
  setRenamingSessionId: (id: string | null) => void
  updateSessionTitle: (id: string, title: string) => void
}

const SessionRow = React.memo(function SessionRow({
  session,
  parentSessions,
  selectedId,
  readSessions,
  pinnedSessions,
  renamingSessionId,
  renameCancelledRef,
  fixTitle,
  onSelect,
  onEmployeeSessionsAvailable,
  togglePin,
  handleDuplicate,
  setDeleteTarget,
  setRenamingSessionId,
  updateSessionTitle,
}: SessionRowProps) {
  const sessionIsActive = session.id === selectedId
  const sessionDot = getStatusDot(session, readSessions)
  const sessionTitle = fixTitle(session.title, session.employee)
  const displayTitle = cleanPreview(sessionTitle) || sessionTitle
  const sessionTime = formatTime(getSessionActivity(session))
  const isPinned = pinnedSessions.has(session.id)
  const isRenaming = renamingSessionId === session.id
  const RowTag = isRenaming ? "div" : "button"

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <RowTag
          {...(!isRenaming && { onClick: () => {
            onSelect(session.id)
            onEmployeeSessionsAvailable?.(parentSessions ?? [session])
          }})}
          className={cn(
            "group/session relative flex w-full items-center gap-2.5 border-l-2 px-4 py-2 text-left transition-colors",
            parentSessions
              ? "pl-11"
              : "pl-6",
            sessionIsActive
              ? "border-l-[var(--text-tertiary)] bg-[var(--fill-secondary)]"
              : "border-l-transparent hover:bg-[var(--fill-tertiary)]"
          )}
        >
          {sessionDot ? (
            <StatusDot
              color={sessionDot.color}
              pulse={sessionDot.pulse}
              title={sessionDot.label}
              className="size-1.5"
            />
          ) : null}
          {isRenaming ? (
            <input
              autoFocus
              maxLength={200}
              defaultValue={displayTitle}
              className={cn(
                "min-w-0 flex-1 truncate border-none bg-transparent text-xs outline-none ring-1 ring-[var(--text-quaternary)] rounded px-0.5",
                sessionIsActive ? "font-semibold text-foreground" : "text-[var(--text-secondary)]"
              )}
              onFocus={(e) => e.target.select()}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur()
                } else if (e.key === "Escape") {
                  renameCancelledRef.current = true
                  setRenamingSessionId(null)
                }
              }}
              onBlur={(e) => {
                if (renameCancelledRef.current) {
                  renameCancelledRef.current = false
                  return
                }
                const val = e.target.value.trim()
                if (val && val !== displayTitle) {
                  updateSessionTitle(session.id, val)
                }
                setRenamingSessionId(null)
              }}
            />
          ) : (
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-xs",
                sessionIsActive ? "font-semibold text-foreground" : "text-[var(--text-secondary)]"
              )}
            >
              {cleanPreview(sessionTitle) || "Untitled"}
            </span>
          )}
          {isPinned ? (
            <Pin className="size-3 shrink-0 text-[var(--text-tertiary)] group-hover/session:lg:hidden group-has-[[data-state=open]]/session:lg:hidden" />
          ) : null}
          <span className="shrink-0 text-[10px] text-[var(--text-quaternary)] group-hover/session:lg:hidden group-has-[[data-state=open]]/session:lg:hidden">{sessionTime}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                aria-label="Session actions"
                className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground lg:size-7 lg:hidden group-hover/session:lg:flex group-has-[[data-state=open]]/session:lg:flex"
              >
                <EllipsisVertical className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { renameCancelledRef.current = false; setRenamingSessionId(session.id) }}>
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => togglePin(session.id)}>
                {isPinned ? "Unpin" : "Pin"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDuplicate(session.id)}>
                Duplicate...
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget({ type: "session", id: session.id, label: cleanPreview(sessionTitle) || "Untitled" })}>
                Delete session
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </RowTag>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => { renameCancelledRef.current = false; setRenamingSessionId(session.id) }}>
          Rename
        </ContextMenuItem>
        <ContextMenuItem onClick={() => togglePin(session.id)}>
          {isPinned ? "Unpin" : "Pin"}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleDuplicate(session.id)}>
          Duplicate...
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onClick={() => setDeleteTarget({ type: "session", id: session.id, label: cleanPreview(sessionTitle) || "Untitled" })}>
          <span className="flex-1">Delete session</span>
          <kbd className="ml-auto pl-3 font-mono text-[10px] text-[var(--text-quaternary)]">⌫</kbd>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
})

interface FlatSessionRowProps {
  session: Session
  /** Avatar/identity slug — employee name, or the portal slug for direct chats. */
  avatarName: string
  /** Human label shown on line 1 (employee display name or portal name). */
  displayName: string
  selectedId: string | null
  readSessions: Set<string>
  pinnedSessions: Set<string>
  renamingSessionId: string | null
  renameCancelledRef: React.MutableRefObject<boolean>
  fixTitle: (title: string | undefined, employee: string | undefined) => string
  onSelect: (id: string) => void
  onEmployeeSessionsAvailable?: (sessions: Session[]) => void
  togglePin: (pinKey: string) => void
  handleDuplicate: (sessionId: string) => void
  setDeleteTarget: (target: { type: "session" | "employee"; id: string; label: string; sessions?: Session[] } | null) => void
  setRenamingSessionId: (id: string | null) => void
  updateSessionTitle: (id: string, title: string) => void
}

// One CHAT per row (focused Today/Yesterday view): employee avatar + name + time
// on the first line, the chat title on the second. Distinct from SessionRow
// (single-line, used for cron + the Older drawer's per-employee children).
const FlatSessionRow = React.memo(function FlatSessionRow({
  session,
  avatarName,
  displayName,
  selectedId,
  readSessions,
  pinnedSessions,
  renamingSessionId,
  renameCancelledRef,
  fixTitle,
  onSelect,
  onEmployeeSessionsAvailable,
  togglePin,
  handleDuplicate,
  setDeleteTarget,
  setRenamingSessionId,
  updateSessionTitle,
}: FlatSessionRowProps) {
  const isActive = session.id === selectedId
  const dot = getStatusDot(session, readSessions)
  const rawTitle = fixTitle(session.title, session.employee)
  const displayTitle = cleanPreview(rawTitle) || "Untitled"
  const time = formatTime(getSessionActivity(session))
  const isPinned = pinnedSessions.has(session.id)
  const isRenaming = renamingSessionId === session.id
  const isUnread =
    !readSessions.has(session.id) && session.status !== "running" && session.status !== "error"

  const menuItems = (
    <>
      <DropdownMenuItem onClick={() => { renameCancelledRef.current = false; setRenamingSessionId(session.id) }}>
        Rename
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => togglePin(session.id)}>
        {isPinned ? "Unpin" : "Pin"}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleDuplicate(session.id)}>
        Duplicate...
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget({ type: "session", id: session.id, label: displayTitle })}>
        Delete session
      </DropdownMenuItem>
    </>
  )

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            "group/flat relative flex w-full items-center gap-3 border-l-2 px-4 py-2 text-left transition-colors",
            isActive
              ? "border-l-[var(--text-tertiary)] bg-[var(--fill-secondary)]"
              : "border-l-transparent hover:bg-[var(--fill-tertiary)]"
          )}
        >
          <button
            onClick={() => {
              onSelect(session.id)
              onEmployeeSessionsAvailable?.([session])
            }}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <div className="relative flex size-9 shrink-0 items-center justify-center">
              <EmployeeAvatar name={avatarName} size={36} />
              {dot ? (
                <StatusDot
                  color={dot.color}
                  pulse={dot.pulse}
                  title={dot.label}
                  className="absolute -bottom-0.5 -right-0 size-2.5 border-2 border-[var(--sidebar-bg)]"
                />
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-baseline gap-2">
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-[13px] tracking-[-0.2px] text-foreground",
                    isUnread || isActive ? "font-semibold" : "font-medium"
                  )}
                >
                  {displayName}
                </span>
                <span className="shrink-0 text-[10px] text-[var(--text-tertiary)]">{time}</span>
              </div>
              {isRenaming ? (
                <input
                  autoFocus
                  maxLength={200}
                  defaultValue={displayTitle}
                  className="min-w-0 w-full truncate rounded border-none bg-transparent px-0.5 text-[11px] text-[var(--text-secondary)] outline-none ring-1 ring-[var(--text-quaternary)]"
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => { e.stopPropagation(); e.preventDefault() }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur()
                    else if (e.key === "Escape") { renameCancelledRef.current = true; setRenamingSessionId(null) }
                  }}
                  onBlur={(e) => {
                    if (renameCancelledRef.current) { renameCancelledRef.current = false; return }
                    const val = e.target.value.trim()
                    if (val && val !== displayTitle) updateSessionTitle(session.id, val)
                    setRenamingSessionId(null)
                  }}
                />
              ) : (
                <div className="truncate text-[11px] text-[var(--text-tertiary)]">{displayTitle}</div>
              )}
            </div>
          </button>

          {isPinned ? (
            <Pin className="size-3 shrink-0 text-[var(--text-tertiary)] group-hover/flat:lg:hidden group-has-[[data-state=open]]/flat:lg:hidden" />
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                aria-label="Chat actions"
                className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground lg:size-7 lg:hidden group-hover/flat:lg:flex group-has-[[data-state=open]]/flat:lg:flex"
              >
                <EllipsisVertical className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">{menuItems}</DropdownMenuContent>
          </DropdownMenu>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => { renameCancelledRef.current = false; setRenamingSessionId(session.id) }}>
          Rename
        </ContextMenuItem>
        <ContextMenuItem onClick={() => togglePin(session.id)}>
          {isPinned ? "Unpin" : "Pin"}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleDuplicate(session.id)}>
          Duplicate...
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onClick={() => setDeleteTarget({ type: "session", id: session.id, label: displayTitle })}>
          <span className="flex-1">Delete session</span>
          <kbd className="ml-auto pl-3 font-mono text-[10px] text-[var(--text-quaternary)]">⌫</kbd>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
})

interface EmployeeRowProps {
  item: FlatItem
  selectedId: string | null
  readSessions: Set<string>
  pinnedSessions: Set<string>
  expanded: Record<string, boolean>
  renamingSessionId: string | null
  renameCancelledRef: React.MutableRefObject<boolean>
  fixTitle: (title: string | undefined, employee: string | undefined) => string
  onSelect: (id: string) => void
  onEmployeeSessionsAvailable?: (sessions: Session[]) => void
  togglePin: (pinKey: string) => void
  handleMarkAllRead: (sessions: Session[]) => void
  handleEmployeeClick: (item: FlatItem) => void
  setDeleteTarget: (target: { type: "session" | "employee"; id: string; label: string; sessions?: Session[] } | null) => void
  onLoadMore: (groupKey: string, offset: number) => void
  loadingMore: Set<string>
  setRenamingSessionId: (id: string | null) => void
  updateSessionTitle: (id: string, title: string) => void
  handleDuplicate: (sessionId: string) => void
}

const EmployeeRow = React.memo(function EmployeeRow({
  item,
  selectedId,
  readSessions,
  pinnedSessions,
  expanded,
  renamingSessionId,
  renameCancelledRef,
  fixTitle,
  onSelect,
  onEmployeeSessionsAvailable,
  togglePin,
  handleMarkAllRead,
  handleEmployeeClick,
  setDeleteTarget,
  onLoadMore,
  loadingMore,
  setRenamingSessionId,
  updateSessionTitle,
  handleDuplicate,
}: EmployeeRowProps) {
  const empName = item.employeeName!
  const empSessions = item.sessions!
  const latestSession = empSessions[0]
  const empInfo = item.employeeData
  const displayName = empInfo?.displayName || titleCase(empName)
  const department = empInfo?.department || ""
  const timeLabel = formatTime(getSessionActivity(latestSession))
  const isActive = empSessions.some((s) => s.id === selectedId)
  const isPinned = pinnedSessions.has(item.pinKey)
  const loadedCount = empSessions.length
  // True total from the server; may exceed what's loaded so far.
  const sessionCount = item.total ?? loadedCount
  const groupKey = item.groupKey ?? empName
  const isLoadingMore = loadingMore.has(groupKey)
  const isExpanded = expanded[empName] || false
  const hasUnread = empSessions.some(
    (s) => !readSessions.has(s.id) && s.status !== "running" && s.status !== "error"
  )
  // The group dot reflects the latest session's live state, but escalates to an
  // "unread" accent dot when any chat in the group is unread.
  const empDot = getStatusDot(latestSession, readSessions, hasUnread)

  const sessionRowProps = {
    selectedId,
    readSessions,
    pinnedSessions,
    renamingSessionId,
    renameCancelledRef,
    fixTitle,
    onSelect,
    onEmployeeSessionsAvailable,
    togglePin,
    handleDuplicate,
    setDeleteTarget,
    setRenamingSessionId,
    updateSessionTitle,
  }

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            onClick={() => handleEmployeeClick(item)}
            className={cn(
              "group/emp relative flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition-colors",
              isActive
                ? "border-l-[var(--text-tertiary)] bg-[var(--fill-secondary)]"
                : "border-l-transparent hover:bg-[var(--fill-tertiary)]"
            )}
          >
            <div className="relative flex size-9 shrink-0 items-center justify-center">
              <EmployeeAvatar name={empName} size={36} />
              {empDot ? (
                <StatusDot
                  color={empDot.color}
                  pulse={empDot.pulse}
                  title={empDot.label}
                  className="absolute -bottom-0.5 -right-0 size-2.5 border-2 border-[var(--sidebar-bg)]"
                />
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-baseline gap-2 pr-9 lg:pr-0">
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-[13px] tracking-[-0.2px] text-foreground",
                    hasUnread || isActive ? "font-semibold" : "font-medium"
                  )}
                >
                  {displayName}
                </span>
                <span className="shrink-0 text-[10px] text-[var(--text-tertiary)] group-hover/emp:lg:hidden group-has-[[data-state=open]]/emp:lg:hidden">{timeLabel}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Employee chat actions"
                      className="absolute right-1 top-1/2 flex size-9 shrink-0 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground lg:static lg:size-7 lg:translate-y-0 lg:hidden group-hover/emp:lg:flex group-has-[[data-state=open]]/emp:lg:flex"
                    >
                      <EllipsisVertical className="size-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => togglePin(item.pinKey)}>
                      {isPinned ? "Unpin" : "Pin"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMarkAllRead(empSessions)}>
                      Mark all as read
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget({ type: "employee", id: empName, label: displayName, sessions: empSessions })}>
                      Delete all chats
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center gap-1.5 overflow-hidden text-[11px] text-[var(--text-tertiary)]">
                {department ? <span className="truncate">{department}</span> : null}
                {sessionCount > 1 ? (
                  <span className="shrink-0 rounded bg-[var(--fill-tertiary)] px-1.5 py-0.5 text-[10px]">
                    {sessionCount} chats
                  </span>
                ) : null}
                {isPinned ? (
                  <Pin className="size-3 shrink-0 text-[var(--text-tertiary)]" />
                ) : null}
              </div>
            </div>
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => togglePin(item.pinKey)}>
            {isPinned ? "Unpin" : "Pin"}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleMarkAllRead(empSessions)}>
            Mark all as read
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive" onClick={() => setDeleteTarget({ type: "employee", id: empName, label: displayName, sessions: empSessions })}>
            Delete all chats
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {isExpanded && loadedCount > 1 ? (
        empSessions.map((session) => (
          <SessionRow key={session.id} session={session} parentSessions={empSessions} {...sessionRowProps} />
        ))
      ) : null}
      {isExpanded && loadedCount < sessionCount ? (
        <button
          onClick={() => onLoadMore(groupKey, loadedCount)}
          disabled={isLoadingMore}
          className="w-full cursor-pointer px-4 pb-2 pl-11 text-left text-[10px] text-[var(--text-quaternary)] transition-colors hover:text-[var(--text-secondary)] disabled:opacity-50"
        >
          {isLoadingMore ? "Loading…" : `+${sessionCount - loadedCount} more`}
        </button>
      ) : null}
    </div>
  )
})

/** A contactable roster row (Managers + Team sections). Clicking starts a chat
 *  with the employee via `onContact`. Shared so the two sections never drift. */
function ContactRow({ emp, onContact }: { emp: Employee; onContact: (name: string) => void }) {
  return (
    <button
      onClick={() => onContact(emp.name)}
      title={`Start a chat with ${emp.displayName || titleCase(emp.name)}`}
      className="group/contact relative flex w-full items-center gap-3 border-l-2 border-l-transparent px-4 py-2.5 text-left transition-colors hover:bg-[var(--fill-tertiary)]"
    >
      <div className="relative flex size-9 shrink-0 items-center justify-center">
        <EmployeeAvatar name={emp.name} size={36} />
      </div>
      <div className="min-w-0 flex-1">
        <span className="block min-w-0 truncate text-[13px] font-medium tracking-[-0.2px] text-foreground">
          {emp.displayName || titleCase(emp.name)}
        </span>
        {emp.department ? (
          <span className="block truncate text-[11px] text-[var(--text-tertiary)]">{emp.department}</span>
        ) : null}
      </div>
      <Plus className="size-3.5 shrink-0 text-[var(--text-quaternary)] transition-colors group-hover/contact:text-[var(--accent)]" />
    </button>
  )
}

export function ChatSidebar({
  selectedId,
  onSelect,
  onNewChat,
  onDelete,
  onDuplicate,
  onSessionsLoaded,
  onEmployeeSessionsAvailable,
  onOrderComputed,
  onContactEmployee,
  onSelectRoom,
}: ChatSidebarProps) {
  const { settings } = useSettings()
  const portalName = settings.portalName ?? "Jinn"
  const portalSlug = portalName.toLowerCase()

  const qc = useQueryClient()
  const { data: rawSessions, isLoading: loading } = useSessions()
  const { data: meta } = useSessionCounts()
  const counts = meta?.counts ?? {}
  const updateSessionMutation = useUpdateSession()
  const deleteSessionMutation = useDeleteSession()
  const bulkDeleteMutation = useBulkDeleteSessions()
  const duplicateSessionMutation = useDuplicateSession()

  const sessions = useMemo(() => {
    if (!rawSessions) return []
    const filtered = (rawSessions as Session[]).filter(isVisibleSource)
    filtered.sort((a, b) => {
      const ta = a.lastActivity || a.createdAt || ""
      const tb = b.lastActivity || b.createdAt || ""
      return tb.localeCompare(ta)
    })
    return filtered
  }, [rawSessions])

  const [search, setSearch] = useState("")
  // Search spans ALL sessions server-side (the loaded page is only a subset).
  const { data: searchResults } = useSessionSearch(search)
  // The slim control row morphs between the Focused/All segmented control and an
  // inline search field; `searchOpen` drives that reveal. Collapsing always
  // clears the query so a hidden field can never leave the list silently filtered.
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setSearch("")
  }, [])
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null)
  const renameCancelledRef = useRef(false)
  const [readSessions, setReadSessions] = useState<Set<string>>(new Set())
  const [pinnedSessions, setPinnedSessions] = useState<Set<string>>(new Set())
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [olderExpanded, setOlderExpanded] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("rooms")
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set())
  const [loadingMore, setLoadingMore] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "session" | "employee"
    id: string
    label: string
    sessions?: Session[]
  } | null>(null)
  const deleteButtonRef = useRef<HTMLButtonElement>(null)
  const { data: orgData } = useOrg()
  const employeeData = useMemo(() => {
    const map = new Map<string, Employee>()
    for (const emp of orgData?.employees ?? []) {
      map.set(emp.name, emp)
    }
    return map
  }, [orgData])
  const onSessionsLoadedRef = useRef(onSessionsLoaded)

  useEffect(() => {
    onSessionsLoadedRef.current = onSessionsLoaded
  }, [onSessionsLoaded])

  useEffect(() => {
    if (sessions.length > 0) {
      startTransition(() => {
        onSessionsLoadedRef.current?.(sessions)
      })
    }
  }, [sessions])

  useEffect(() => {
    setReadSessions(getReadSessions())
    setPinnedSessions(getPinnedSessions())
    setCollapsed(loadCollapsedState())
    setExpanded(loadExpandedState())
    try {
      setOlderExpanded(localStorage.getItem(OLDER_EXPANDED_STORAGE_KEY) === "true")
      const stored = localStorage.getItem(FOCUS_MODE_STORAGE_KEY)
      if (stored === "rooms" || stored === "focused" || stored === "all") setViewMode(stored)
      setExpandedRooms(loadExpandedRooms())
    } catch {}
  }, [])

  useEffect(() => {
    if (selectedId) {
      markSessionRead(selectedId)
      setReadSessions((prev) => {
        const next = new Set(prev)
        next.add(selectedId)
        return next
      })
    }
  }, [selectedId])


  // Focus the inline search field once it has morphed open.
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
  }, [searchOpen])

  const selectViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode)
    try { localStorage.setItem(FOCUS_MODE_STORAGE_KEY, mode) } catch {}
  }, [])

  const toggleRoomExpanded = useCallback((roomId: string) => {
    setExpandedRooms((prev) => {
      const next = new Set(prev)
      if (next.has(roomId)) next.delete(roomId)
      else next.add(roomId)
      saveExpandedRooms(next)
      return next
    })
  }, [])

  const toggleOlderExpanded = useCallback(() => {
    setOlderExpanded((prev) => {
      const next = !prev
      try { localStorage.setItem(OLDER_EXPANDED_STORAGE_KEY, String(next)) } catch {}
      return next
    })
  }, [])

  const toggleCronCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has("cron")) next.delete("cron")
      else next.add("cron")
      saveCollapsedState(next)
      return next
    })
  }, [])

  // Fetch the next page for one group and merge it into the cached session list.
  const handleLoadMore = useCallback(async (groupKey: string, offset: number) => {
    if (loadingMore.has(groupKey)) return
    setLoadingMore((prev) => new Set(prev).add(groupKey))
    try {
      const more = await api.getSessionsForGroup(groupKey, offset, 50)
      qc.setQueryData<SessionsResponse>(queryKeys.sessions.all, (old) => {
        if (!old) return old
        const seen = new Set(old.sessions.map((s) => s.id as string))
        const merged = [...old.sessions, ...more.filter((s) => !seen.has(s.id as string))]
        return { ...old, sessions: merged }
      })
    } catch {
      /* surfaced by the disabled state resetting; non-fatal */
    } finally {
      setLoadingMore((prev) => {
        const next = new Set(prev)
        next.delete(groupKey)
        return next
      })
    }
  }, [qc, loadingMore])

  const toggleEmployeeExpanded = useCallback((empName: string) => {
    setExpanded((prev) => {
      const next = { ...prev, [empName]: !prev[empName] }
      saveExpandedState(next)
      return next
    })
  }, [])

  const togglePin = useCallback((pinKey: string) => {
    setPinnedSessions((prev) => {
      const next = new Set(prev)
      if (next.has(pinKey)) next.delete(pinKey)
      else next.add(pinKey)
      savePinnedSessions(next)
      return next
    })
  }, [])

  const handleMarkAllRead = useCallback((empSessions: Session[]) => {
    markAllReadForEmployee(empSessions)
    setReadSessions((prev) => {
      const next = new Set(prev)
      for (const s of empSessions) next.add(s.id)
      return next
    })
  }, [])

  async function handleDeleteEmployee(empName: string, empSessions: Session[]) {
    const ids = empSessions.map((s) => s.id)
    try {
      await bulkDeleteMutation.mutateAsync(ids)
      setPinnedSessions((prev) => {
        const next = new Set(prev)
        next.delete(`emp:${empName}`)
        for (const id of ids) next.delete(id)
        savePinnedSessions(next)
        return next
      })
      startTransition(() => {
        if (selectedId && ids.includes(selectedId)) onNewChat()
      })
    } catch {}
  }

  async function handleDelete(sessionId: string) {
    // Compute next session to select before removing
    let nextSelectId: string | null = null
    if (selectedId === sessionId) {
      // Pick the neighbour in the current visible order (Today → Yesterday →
      // Older drawer → Scheduled), already de-duped in allFlatIds.
      const allVisible = allFlatIds.sessionIds
      const idx = allVisible.indexOf(sessionId)
      if (idx !== -1) {
        // Prefer next item, then previous
        if (idx + 1 < allVisible.length) nextSelectId = allVisible[idx + 1]
        else if (idx - 1 >= 0) nextSelectId = allVisible[idx - 1]
      }
    }

    try {
      await deleteSessionMutation.mutateAsync(sessionId)
      setPinnedSessions((prev) => {
        if (!prev.has(sessionId)) return prev
        const next = new Set(prev)
        next.delete(sessionId)
        savePinnedSessions(next)
        return next
      })
      startTransition(() => {
        if (nextSelectId) {
          onSelect(nextSelectId)
        } else if (onDelete) {
          onDelete(sessionId)
        } else if (selectedId === sessionId) {
          onNewChat()
        }
      })
    } catch {}
  }

  const {
    searching,
    searchRows,
    todayRows,
    yesterdayRows,
    olderSummary,
    olderFocusedRows,
    hiddenAutomated,
    olderPinned,
    olderUnpinned,
    pinnedFlat,
    unpinnedFlat,
    sortedCron,
    cronSessions,
    cronTotal,
  } = useMemo(() => {
    // When searching, use server results (spans all sessions); "load more" is
    // disabled in this mode since totals reflect the search, not each group.
    const searching = search.trim().length > 0
    const displayed = searching
      ? ((searchResults as Session[] | undefined) ?? []).filter(isVisibleSource)
      : sessions

    // Resolve the avatar slug + human label for a flat row (see resolveRowIdentity).
    const toRow = (s: Session): FlatRow => ({
      session: s,
      ...resolveRowIdentity(s, { portalSlug, portalName, employeeData }),
    })

    // ---- Search mode: one flat list spanning everything matched. ----
    if (searching) {
      const searchRows = sortSessionsByActivity(displayed).map(toRow)
      return {
        searching,
        searchRows,
        todayRows: [] as FlatRow[],
        yesterdayRows: [] as FlatRow[],
        olderSummary: { chats: 0, employees: 0 },
        olderFocusedRows: [] as FlatRow[],
        hiddenAutomated: 0,
        olderPinned: [] as FlatItem[],
        olderUnpinned: [] as FlatItem[],
        pinnedFlat: [] as FlatItem[],
        unpinnedFlat: [] as FlatItem[],
        sortedCron: [] as Session[],
        cronSessions: [] as Session[],
        cronTotal: 0,
      }
    }

    // ---- Default mode: recency buckets + per-employee Older drawer. ----
    // In "focused" mode the Today/Yesterday/Older buckets only contain the
    // operator's own top-level chats (isFocusedSession); delegated children and
    // other automated sessions are hidden until "All" is selected. The
    // per-employee groups (drawer in All mode + keyboard cycling + contactable
    // roster) are always built from every non-cron session so they stay stable.
    const focused = viewMode === "focused"
    const now = new Date()
    const cronSessions: Session[] = []
    const directSessions: Session[] = []
    const employeeSessionMap = new Map<string, Session[]>()
    const todayRows: FlatRow[] = []
    const yesterdayRows: FlatRow[] = []
    // Focused-mode Older = older user-initiated chats, as flat rows (computed
    // from loaded sessions; the deep tail beyond the per-group window is reachable
    // via search). All-mode Older uses the authoritative `counts` instead.
    const olderFocusedRows: FlatRow[] = []
    let hiddenAutomated = 0
    // today+yesterday sessions surfaced per group — drives the All-mode Older math.
    const recentByGroup: Record<string, number> = {}

    for (const s of displayed) {
      if (isCronSession(s)) {
        cronSessions.push(s)
        continue
      }
      const isDirect = isDirectSession(s, portalSlug)
      const groupKey = isDirect ? DIRECT_GROUP : s.employee!
      if (isDirect) directSessions.push(s)
      else {
        if (!employeeSessionMap.has(groupKey)) employeeSessionMap.set(groupKey, [])
        employeeSessionMap.get(groupKey)!.push(s)
      }
      // Focused filter gates only the recency buckets, not the employee groups.
      if (focused && !isFocusedSession(s)) {
        hiddenAutomated += 1
        continue
      }
      const bucket = bucketByDay(getSessionActivity(s), now)
      if (bucket === "today") {
        todayRows.push(toRow(s))
        recentByGroup[groupKey] = (recentByGroup[groupKey] ?? 0) + 1
      } else if (bucket === "yesterday") {
        yesterdayRows.push(toRow(s))
        recentByGroup[groupKey] = (recentByGroup[groupKey] ?? 0) + 1
      } else if (focused) {
        olderFocusedRows.push(toRow(s))
      }
    }

    todayRows.sort((a, b) => getSessionActivity(b.session).localeCompare(getSessionActivity(a.session)))
    yesterdayRows.sort((a, b) => getSessionActivity(b.session).localeCompare(getSessionActivity(a.session)))
    olderFocusedRows.sort((a, b) => getSessionActivity(b.session).localeCompare(getSessionActivity(a.session)))

    // Per-employee groups (full history) — used by the Older drawer + keyboard nav.
    const flatItems: FlatItem[] = []
    for (const [empName, empSessions] of employeeSessionMap) {
      const sorted = sortSessionsByActivity(empSessions)
      flatItems.push({
        type: "employee",
        employeeName: empName,
        employeeData: employeeData.get(empName),
        sessions: sorted,
        sortKey: getSessionActivity(sorted[0]),
        pinKey: `emp:${empName}`,
        groupKey: empName,
        total: counts[empName] ?? sorted.length,
      })
    }
    if (directSessions.length > 0) {
      const sorted = sortSessionsByActivity(directSessions)
      flatItems.push({
        type: "employee",
        employeeName: portalSlug,
        employeeData: {
          name: portalSlug,
          displayName: portalName,
          emoji: "\u{1F4AC}",
          department: "direct",
          role: "",
          rank: "manager",
          engine: "",
          model: "",
          persona: "",
        } as Employee,
        sessions: sorted,
        sortKey: getSessionActivity(sorted[0]),
        pinKey: `emp:${portalSlug}`,
        groupKey: DIRECT_GROUP,
        total: counts[DIRECT_GROUP] ?? sorted.length,
      })
    }

    const pinnedFlat = flatItems
      .filter((item) => pinnedSessions.has(item.pinKey))
      .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
    const unpinnedFlat = flatItems
      .filter((item) => !pinnedSessions.has(item.pinKey))
      .sort((a, b) => b.sortKey.localeCompare(a.sortKey))

    // Older drawer = only groups that actually have sessions beyond yesterday.
    const hasOlder = (item: FlatItem) =>
      (item.total ?? item.sessions!.length) - (recentByGroup[item.groupKey ?? item.employeeName!] ?? 0) > 0
    const olderPinned = pinnedFlat.filter(hasOlder)
    const olderUnpinned = unpinnedFlat.filter(hasOlder)

    // Older summary. Focused: count the loaded older user-initiated chats +
    // their distinct employees (direct/COO excluded from the employee tally).
    // All: authoritative — every non-cron group total minus what's already shown
    // in Today/Yesterday.
    let olderSummary: { chats: number; employees: number }
    if (focused) {
      const emps = new Set<string>()
      for (const r of olderFocusedRows) {
        if (!isDirectSession(r.session, portalSlug) && r.session.employee) emps.add(r.session.employee)
      }
      olderSummary = { chats: olderFocusedRows.length, employees: emps.size }
    } else {
      const nonCronTotals: Record<string, number> = {}
      for (const [k, v] of Object.entries(counts)) {
        if (k !== CRON_GROUP) nonCronTotals[k] = v
      }
      olderSummary = summarizeOlder(nonCronTotals, recentByGroup, new Set([DIRECT_GROUP]))
    }

    const sortedCron = sortSessionsByActivity(cronSessions)
    const cronTotal = counts[CRON_GROUP] ?? cronSessions.length

    return {
      searching,
      searchRows: [] as FlatRow[],
      todayRows,
      yesterdayRows,
      olderSummary,
      olderFocusedRows,
      hiddenAutomated,
      olderPinned,
      olderUnpinned,
      pinnedFlat,
      unpinnedFlat,
      sortedCron,
      cronSessions,
      cronTotal,
    }
  }, [sessions, search, searchResults, employeeData, portalSlug, portalName, pinnedSessions, counts, viewMode])

  // Rooms view-mode: group the loaded non-cron sessions into department
  // project-rooms (pure layer in lib/rooms). Derived independently of the flat
  // pipeline above so it stays simple and the existing modes are untouched.
  const rooms = useMemo<DepartmentRoom[]>(() => {
    if (viewMode !== "rooms") return []
    const employees = (orgData?.employees ?? []) as RoomEmployee[]
    return groupSessionsByDepartment(sessions as unknown as RoomSession[], employees)
  }, [viewMode, sessions, orgData])

  const cronCollapsed = collapsed.has("cron")

  // Contactable employees: the full org roster MERGED with the employees that
  // already have sessions, then sliced down to the roster-only tail (employees
  // with ZERO sessions). These are listed so they can be contacted directly.
  // Hidden while searching (search spans real sessions, not the roster) and the
  // COO/portal row is excluded (reachable via "New chat").
  const contactableEmployees = useMemo(() => {
    if (search.trim()) return []
    const sessionful = [...pinnedFlat, ...unpinnedFlat]
      .map((item) => item.employeeName)
      .filter((n): n is string => !!n)
    const sessionfulSet = new Set(sessionful)
    const rosterNames = (orgData?.employees ?? []).map((e) => e.name)
    const merged = mergeSidebarEmployees(sessionful, rosterNames)
    return merged
      .filter((name) => !sessionfulSet.has(name) && name !== portalSlug)
      .map((name) => employeeData.get(name))
      .filter((e): e is Employee => !!e)
  }, [search, pinnedFlat, unpinnedFlat, orgData, employeeData, portalSlug])

  // Managers + executives — a quick-access roster rendered ABOVE Team. Shown
  // regardless of whether they already have sessions (so all leadership is one
  // tap away); they may also appear in Team. Executives first, then by name.
  // Hidden during search (the flat results span everything already).
  const managerEmployees = useMemo(() => {
    if (search.trim()) return []
    return (orgData?.employees ?? [])
      .filter((e) => (e.rank === "manager" || e.rank === "executive") && e.name !== portalSlug)
      .sort((a, b) => {
        const ra = a.rank === "executive" ? 0 : 1
        const rb = b.rank === "executive" ? 0 : 1
        return ra - rb || (a.displayName || a.name).localeCompare(b.displayName || b.name)
      })
  }, [search, orgData, portalSlug])

  // Emit flat session order for keyboard navigation (J/K/E shortcuts).
  // Visual order: Today → Yesterday → (Older drawer, if open) → Scheduled.
  // De-duped — an employee's older sessions can overlap their Today/Yesterday rows.
  const orderRef = useRef<string>('')
  const allFlatIds = useMemo(() => {
    const ids: string[] = []
    const seen = new Set<string>()
    const push = (id: string) => { if (!seen.has(id)) { seen.add(id); ids.push(id) } }

    if (searching) {
      for (const r of searchRows) push(r.session.id)
      return { sessionIds: ids, employeeNames: [] as string[], employeeSessionMap: {} as Record<string, string[]> }
    }

    // Rooms mode: keyboard j/k cycles every room's sessions (room order, then
    // newest-first within), regardless of whether the room is expanded — so nav
    // is never dead in the default all-collapsed view. Then cron.
    if (viewMode === "rooms") {
      const empNames: string[] = []
      const empMap: Record<string, string[]> = {}
      for (const room of rooms) {
        for (const s of room.sessions) push(s.id)
      }
      for (const s of sortedCron) push(s.id)
      for (const item of [...pinnedFlat, ...unpinnedFlat]) {
        const name = item.employeeName!
        empNames.push(name)
        empMap[name] = item.sessions!.map((s) => s.id)
      }
      return { sessionIds: ids, employeeNames: empNames, employeeSessionMap: empMap }
    }

    for (const r of todayRows) push(r.session.id)
    for (const r of yesterdayRows) push(r.session.id)
    if (olderExpanded) {
      if (viewMode === "focused") {
        for (const r of olderFocusedRows) push(r.session.id)
      } else {
        for (const item of [...olderPinned, ...olderUnpinned]) {
          const sessionIds = item.sessions!.map((s) => s.id)
          // Collapsed employee row reaches only its latest session; expanded reaches all.
          if (expanded[item.employeeName!]) sessionIds.forEach(push)
          else if (sessionIds.length) push(sessionIds[0])
        }
      }
    }
    for (const s of sortedCron) push(s.id)

    // E-shortcut cycles every employee with sessions, regardless of Older state.
    const empNames: string[] = []
    const empMap: Record<string, string[]> = {}
    for (const item of [...pinnedFlat, ...unpinnedFlat]) {
      const name = item.employeeName!
      empNames.push(name)
      empMap[name] = item.sessions!.map((s) => s.id)
    }
    return { sessionIds: ids, employeeNames: empNames, employeeSessionMap: empMap }
  }, [searching, searchRows, todayRows, yesterdayRows, olderExpanded, viewMode, olderFocusedRows, olderPinned, olderUnpinned, expanded, sortedCron, pinnedFlat, unpinnedFlat, rooms])

  useEffect(() => {
    const key = allFlatIds.sessionIds.join(',')
    if (key !== orderRef.current) {
      orderRef.current = key
      onOrderComputed?.(allFlatIds)
    }
  }, [allFlatIds, onOrderComputed])

  const handleEmployeeClick = useCallback((item: FlatItem) => {
    const empName = item.employeeName!
    const empSessions = item.sessions!
    if (empSessions.length > 1) {
      // Toggle expand/collapse — selecting latest session when expanding
      const wasExpanded = expanded[empName] || false
      toggleEmployeeExpanded(empName)
      if (!wasExpanded) {
        onSelect(empSessions[0].id)
        onEmployeeSessionsAvailable?.(empSessions)
      }
    } else {
      onSelect(empSessions[0].id)
      onEmployeeSessionsAvailable?.(empSessions)
    }
  }, [expanded, toggleEmployeeExpanded, onSelect, onEmployeeSessionsAvailable])

  const fixTitleCb = useCallback((title: string | undefined, employee: string | undefined) => {
    if (!title) return employee || portalName
    if (portalName !== "Jinn" && title.startsWith("Jinn - ")) {
      return portalName + title.slice(4)
    }
    return title
  }, [portalName])

  const updateSessionTitle = useCallback((id: string, title: string) => {
    updateSessionMutation.mutate({ id, data: { title } })
  }, [updateSessionMutation])

  const handleDuplicateCb = useCallback(async (sessionId: string) => {
    try {
      const result = await duplicateSessionMutation.mutateAsync(sessionId) as { id?: string }
      if (result?.id) {
        onDuplicate?.(result.id)
        onSelect(result.id)
        setRenamingSessionId(result.id)
        renameCancelledRef.current = false
      }
    } catch (err: any) {
      window.alert(`Duplicate failed: ${err.message || "Unknown error"}`)
    }
  }, [duplicateSessionMutation, onDuplicate, onSelect])

  // Shared props passed to all SessionRow and EmployeeRow instances
  const sharedRowProps = useMemo(() => ({
    selectedId,
    readSessions,
    pinnedSessions,
    renamingSessionId,
    renameCancelledRef,
    fixTitle: fixTitleCb,
    onSelect,
    onEmployeeSessionsAvailable,
    togglePin,
    handleDuplicate: handleDuplicateCb,
    setDeleteTarget,
    setRenamingSessionId,
    updateSessionTitle,
  }), [selectedId, readSessions, pinnedSessions, renamingSessionId, fixTitleCb, onSelect, onEmployeeSessionsAvailable, togglePin, handleDuplicateCb, updateSessionTitle])

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  // Apple nav-bar pattern: the control band carries NO line at rest, and a
  // single --separator hairline appears under it only once rows scroll beneath.
  const [listScrolled, setListScrolled] = useState(false)
  const handleListScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const next = e.currentTarget.scrollTop > 2
    setListScrolled((prev) => (prev === next ? prev : next))
  }, [])

  // Build one flat list for the (optional) virtualizer. The focused layout is a
  // sequence of section labels, flat session rows (Today/Yesterday/search), the
  // collapsible Older summary + its per-employee drawer, and the cron section.
  type VirtualItem =
    | { kind: "section"; id: string; label: string; count?: number }
    | { kind: "flat"; row: FlatRow }
    | { kind: "older-line" }
    | { kind: "older-header" }
    | { kind: "employee"; item: FlatItem }
    | { kind: "room-header"; room: DepartmentRoom }
    | { kind: "cron-header" }
    | { kind: "cron-session"; session: Session }
    | { kind: "cron-more" }

  const virtualItems = useMemo<VirtualItem[]>(() => {
    const list: VirtualItem[] = []
    if (searching) {
      for (const row of searchRows) list.push({ kind: "flat", row })
      return list
    }
    // Rooms view-mode: a collapsible department header per room, with the room's
    // sessions nested beneath as the SAME flat rows used elsewhere (so each agent
    // session stays individually openable — provenance preserved). Cron keeps its
    // own Scheduled section below, in every mode.
    if (viewMode === "rooms") {
      for (const room of rooms) {
        list.push({ kind: "room-header", room })
        if (expandedRooms.has(room.id)) {
          for (const rs of room.sessions) {
            // room.sessions are the same Session objects fed in (RoomSession is a
            // structural subset); cast back at the render boundary.
            const s = rs as unknown as Session
            const { avatarName, displayName } = resolveRowIdentity(s, { portalSlug, portalName, employeeData })
            list.push({ kind: "flat", row: { session: s, avatarName, displayName } })
          }
        }
      }
      if (cronSessions.length > 0) {
        list.push({ kind: "cron-header" })
        if (!cronCollapsed) {
          for (const s of sortedCron) list.push({ kind: "cron-session", session: s })
          if (cronSessions.length < cronTotal) list.push({ kind: "cron-more" })
        }
      }
      return list
    }
    if (todayRows.length > 0) {
      list.push({ kind: "section", id: "today", label: "Today", count: todayRows.length })
      for (const row of todayRows) list.push({ kind: "flat", row })
    }
    if (yesterdayRows.length > 0) {
      list.push({ kind: "section", id: "yesterday", label: "Yesterday", count: yesterdayRows.length })
      for (const row of yesterdayRows) list.push({ kind: "flat", row })
    }
    if (olderSummary.chats > 0) {
      if (!olderExpanded) {
        list.push({ kind: "older-line" })
      } else if (viewMode === "focused") {
        // Focused Older = flat older user-initiated chats (no per-employee drawer).
        list.push({ kind: "older-header" })
        for (const row of olderFocusedRows) list.push({ kind: "flat", row })
      } else {
        list.push({ kind: "older-header" })
        for (const item of olderPinned) list.push({ kind: "employee", item })
        for (const item of olderUnpinned) list.push({ kind: "employee", item })
      }
    }
    if (cronSessions.length > 0) {
      list.push({ kind: "cron-header" })
      if (!cronCollapsed) {
        for (const s of sortedCron) list.push({ kind: "cron-session", session: s })
        if (cronSessions.length < cronTotal) list.push({ kind: "cron-more" })
      }
    }
    return list
  }, [searching, searchRows, todayRows, yesterdayRows, olderSummary.chats, olderExpanded, viewMode, olderFocusedRows, olderPinned, olderUnpinned, cronSessions.length, cronCollapsed, sortedCron, cronTotal, rooms, expandedRooms, portalSlug, portalName, employeeData])

  const VIRTUALIZE_THRESHOLD = 50
  const shouldVirtualize = virtualItems.length >= VIRTUALIZE_THRESHOLD

  const rowVirtualizer = useVirtualizer({
    count: shouldVirtualize ? virtualItems.length : 0,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: (index) => {
      if (!shouldVirtualize) return 52
      const vi = virtualItems[index]
      switch (vi.kind) {
        case "section": return 32
        case "older-header": return 36
        case "older-line": return 40
        case "cron-header": return 36
        case "cron-session": return 36
        case "cron-more": return 28
        case "flat": return 52
        case "room-header": return 56
        default: return 64 // employee row (dynamic — measured)
      }
    },
    overscan: 5,
    enabled: shouldVirtualize,
  })

  const olderLineLabel = useMemo(() => {
    const { chats, employees } = olderSummary
    const chatWord = chats === 1 ? "chat" : "chats"
    if (employees <= 0) return `Older · ${chats} ${chatWord}`
    const empWord = employees === 1 ? "employee" : "employees"
    return `Older · ${chats} ${chatWord} across ${employees} ${empWord}`
  }, [olderSummary])

  const cronHeader = (
    <button
      onClick={toggleCronCollapsed}
      className="flex w-full items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-[var(--fill-tertiary)]"
    >
      <span className={SECTION_LABEL_CLASS}>Scheduled</span>
      <span className={cn("ml-auto", SECTION_COUNT_CLASS)}>{cronTotal}</span>
      <ChevronDown className={cn("size-3.5 shrink-0 text-[var(--text-quaternary)] transition-transform", cronCollapsed && "-rotate-90")} />
    </button>
  )

  // Single source of truth for rendering a VirtualItem — shared by the
  // virtualized and plain render paths so they can never drift apart.
  const renderItem = (vi: VirtualItem): React.ReactNode => {
    switch (vi.kind) {
      case "section":
        return (
          <div className="flex items-center gap-2 px-4 pb-1 pt-3">
            <span className={SECTION_LABEL_CLASS}>{vi.label}</span>
            {typeof vi.count === "number" && (
              <span className={SECTION_COUNT_CLASS}>{vi.count}</span>
            )}
          </div>
        )
      case "flat":
        return (
          <FlatSessionRow
            session={vi.row.session}
            avatarName={vi.row.avatarName}
            displayName={vi.row.displayName}
            {...sharedRowProps}
          />
        )
      case "room-header": {
        const room = vi.room
        const isActive = selectedId === roomSelectionId(room.id)
        const isExpanded = expandedRooms.has(room.id)
        const lastActive = formatTime(room.lastActivity)
        return (
          <div
            className={cn(
              "relative flex w-full items-center border-l-2 transition-colors",
              isActive
                ? "border-l-[var(--accent)] bg-[var(--fill-secondary)]"
                : "border-l-transparent hover:bg-[var(--fill-tertiary)]",
            )}
          >
            <button
              onClick={() => toggleRoomExpanded(room.id)}
              aria-label={isExpanded ? `Collapse ${room.name} agents` : `Show ${room.name} agents`}
              aria-expanded={isExpanded}
              className="ml-1 flex size-7 shrink-0 items-center justify-center rounded text-[var(--text-quaternary)] transition-colors hover:text-[var(--text-secondary)]"
            >
              <ChevronDown className={cn("size-3.5 transition-transform", !isExpanded && "-rotate-90")} />
            </button>
            <button
              onClick={() => onSelectRoom?.(room.id)}
              title={`Open ${room.name} room`}
              aria-current={isActive ? "true" : undefined}
              className="flex min-w-0 flex-1 items-center gap-2 py-2 pr-3 text-left"
            >
              <Layers className="size-4 shrink-0 text-[var(--text-tertiary)]" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "truncate text-[13px] font-semibold tracking-[-0.2px]",
                      isActive ? "text-foreground" : "text-[var(--text-secondary)]",
                    )}
                  >
                    {room.name}
                  </span>
                  {room.status === "active" && (
                    <span className="size-1.5 shrink-0 rounded-full bg-[var(--accent)]" aria-label="active" />
                  )}
                </span>
                <span className="block truncate text-[11px] text-[var(--text-tertiary)]">
                  {room.participantCount} {room.participantCount === 1 ? "agent" : "agents"}
                  {lastActive ? ` · ${lastActive}` : ""}
                </span>
              </span>
              <span className="shrink-0 text-[11px] tabular-nums text-[var(--text-quaternary)]">{room.sessionCount}</span>
            </button>
          </div>
        )
      }
      case "older-line":
        return (
          <button
            onClick={toggleOlderExpanded}
            className="mt-1 flex w-full items-center gap-2 px-4 py-2.5 text-left text-[12px] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--fill-tertiary)] hover:text-[var(--text-secondary)]"
          >
            <Clock3 className="size-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{olderLineLabel}</span>
            <ChevronDown className="size-3.5 shrink-0 -rotate-90" />
          </button>
        )
      case "older-header":
        return (
          <button
            onClick={toggleOlderExpanded}
            className="mt-1 flex w-full items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-[var(--fill-tertiary)]"
          >
            <span className={SECTION_LABEL_CLASS}>Older</span>
            <span className={cn("ml-auto", SECTION_COUNT_CLASS)}>{olderSummary.chats}</span>
            <ChevronDown className="size-3.5 shrink-0 text-[var(--text-quaternary)]" />
          </button>
        )
      case "employee":
        return (
          <EmployeeRow
            item={vi.item}
            expanded={expanded}
            handleEmployeeClick={handleEmployeeClick}
            handleMarkAllRead={handleMarkAllRead}
            onLoadMore={handleLoadMore}
            loadingMore={loadingMore}
            {...sharedRowProps}
          />
        )
      case "cron-header":
        return <div className={cn(virtualItems[0]?.kind === "cron-header" && "mt-0")}>{cronHeader}</div>
      case "cron-session":
        return <SessionRow session={vi.session} {...sharedRowProps} />
      case "cron-more":
        return (
          <button
            onClick={() => handleLoadMore(CRON_GROUP, cronSessions.length)}
            disabled={loadingMore.has(CRON_GROUP)}
            className="w-full cursor-pointer px-4 pb-2 pl-11 text-left text-[10px] text-[var(--text-quaternary)] transition-colors hover:text-[var(--text-secondary)] disabled:opacity-50"
          >
            {loadingMore.has(CRON_GROUP) ? "Loading…" : `+${cronTotal - cronSessions.length} more`}
          </button>
        )
      default:
        return null
    }
  }

  return (
    <div className="relative z-10 flex h-full flex-col bg-[var(--sidebar-bg)] shadow-[var(--shadow-card)]">
      {/* One slim control row. At rest it shows the Focused/All segmented
          control (left) + a borderless search icon (right); tapping search
          morphs the whole row into an inline search field. The page title and
          "+ New" affordance now live in the header pill, so neither lives here.
          Separation is fills only — no hairlines at rest. */}
      {/* Control band — part of the List surface (--sidebar-bg), not the
          Thread. A scroll-activated separator (below) is the only line; at rest
          it's borderless. */}
      <div
        className={cn(
          "shrink-0 bg-[var(--sidebar-bg)] px-3 py-2 transition-shadow duration-150",
          listScrolled && "shadow-[0_1px_0_0_var(--separator)]",
        )}
      >
        <div className="relative flex h-9 items-center">
          {/* Resting controls — fade/disable while the search field is open. */}
          <div
            className={cn(
              "flex w-full items-center gap-2 transition-opacity duration-200 [transition-timing-function:var(--ease-smooth)] motion-reduce:transition-none",
              searchOpen ? "pointer-events-none opacity-0" : "opacity-100",
            )}
            aria-hidden={searchOpen}
          >
            {/* Rooms (default) groups chats into department project-rooms;
                Focused shows only the operator's own top-level chats; All reveals
                delegated/automated sessions too. Persisted; search spans
                everything regardless of mode. */}
            <div className="flex items-center gap-0.5 rounded-full bg-[var(--fill-tertiary)] p-0.5 text-[11px] font-medium">
              {(["rooms", "focused", "all"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => selectViewMode(mode)}
                  aria-pressed={viewMode === mode}
                  title={
                    mode === "rooms"
                      ? "Group chats by department project-room"
                      : mode === "focused"
                        ? "Only chats you started"
                        : "Include automated & delegated sessions"
                  }
                  className={cn(
                    "rounded-full px-2.5 py-1 capitalize transition-all",
                    viewMode === mode
                      ? "bg-[var(--bg-secondary)] text-foreground shadow-[var(--shadow-subtle)]"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            <button
              onClick={() => setSearchOpen(true)}
              title="Search chats"
              aria-label="Search chats"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--fill-secondary)] hover:text-foreground"
            >
              <Search className="size-[18px]" />
            </button>
          </div>

          {/* Inline search field — morphs in from the right (width + opacity). */}
          <div
            className={cn(
              "absolute inset-y-0 right-0 flex items-center gap-2 overflow-hidden rounded-[var(--radius-md)] bg-[var(--fill-tertiary)] transition-[width,opacity] duration-200 [transition-timing-function:var(--ease-smooth)] motion-reduce:transition-none",
              searchOpen ? "w-full px-3 opacity-100" : "w-0 px-0 opacity-0",
            )}
          >
            <Search className="size-3.5 shrink-0 text-[var(--text-tertiary)]" />
            <input
              id="chat-search"
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault()
                  closeSearch()
                }
              }}
              placeholder="Search..."
              aria-label="Search chats"
              tabIndex={searchOpen ? 0 : -1}
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-[var(--text-tertiary)]"
            />
            <button
              onClick={closeSearch}
              tabIndex={searchOpen ? 0 : -1}
              aria-label="Close search"
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[var(--text-tertiary)] transition-colors hover:bg-[var(--fill-secondary)] hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {/* C10: short top scrim so rows dissolve under the header instead of
            clipping at a hard seam (the header border is gone). Theme-aware. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-3"
          style={{ background: "linear-gradient(to bottom, var(--sidebar-bg), transparent)" }}
        />
        <div ref={scrollContainerRef} onScroll={handleListScroll} className="h-full overflow-y-auto pb-[calc(49px+var(--safe-bottom))] lg:pb-0">
        {loading ? (
          <div className="px-4 py-8 text-center text-xs text-[var(--text-quaternary)]">
            Loading sessions...
          </div>
        ) : virtualItems.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-[var(--text-quaternary)]">
            {search.trim() ? (
              "No matching chats"
            ) : viewMode === "focused" && hiddenAutomated > 0 ? (
              <>
                No personal chats here.{" "}
                <button onClick={() => selectViewMode("all")} className="text-[var(--accent)] hover:underline">
                  View all ({hiddenAutomated} automated)
                </button>
              </>
            ) : (
              "No conversations yet"
            )}
          </div>
        ) : shouldVirtualize ? (
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
            {rowVirtualizer.getVirtualItems().map((vr) => {
              const vi = virtualItems[vr.index]
              return (
                <div
                  key={vr.key}
                  ref={rowVirtualizer.measureElement}
                  data-index={vr.index}
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${vr.start}px)` }}
                >
                  {renderItem(vi)}
                </div>
              )
            })}
          </div>
        ) : (
          <>
            {virtualItems.map((vi, i) => (
              <React.Fragment key={
                vi.kind === "flat" ? vi.row.session.id
                : vi.kind === "employee" ? vi.item.pinKey
                : vi.kind === "cron-session" ? vi.session.id
                : vi.kind === "section" ? `section:${vi.id}`
                : vi.kind === "room-header" ? `room:${vi.room.id}`
                : `${vi.kind}:${i}`
              }>
                {renderItem(vi)}
              </React.Fragment>
            ))}
          </>
        )}

        {/* Managers — quick access to leadership ABOVE Team. A manager may also
            appear in Team below (intentional dup); this section is always present
            regardless of whether they have sessions. */}
        {!loading && onContactEmployee && managerEmployees.length > 0 ? (
          <div className="mt-3 pt-1">
            <SectionLabel label="Managers" count={managerEmployees.length} />
            {managerEmployees.map((emp) => (
              <ContactRow key={emp.name} emp={emp} onContact={onContactEmployee} />
            ))}
          </div>
        ) : null}

        {!loading && onContactEmployee && contactableEmployees.length > 0 ? (
          <div className="mt-3 pt-1">
            <SectionLabel label="Team" count={contactableEmployees.length} />
            {contactableEmployees.map((emp) => (
              <ContactRow key={emp.name} emp={emp} onContact={onContactEmployee} />
            ))}
          </div>
        ) : null}
        </div>
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent showCloseButton={false} className="max-w-sm" onOpenAutoFocus={(e) => { e.preventDefault(); deleteButtonRef.current?.focus() }}>
          <DialogHeader>
            <DialogTitle>
              {deleteTarget?.type === "employee"
                ? `Delete all chats with "${deleteTarget.label}"?`
                : `Delete "${deleteTarget?.label}"?`}
            </DialogTitle>
            <DialogDescription>
              {deleteTarget?.type === "employee"
                ? `This will permanently delete ${deleteTarget.sessions?.length ?? 0} session(s) and all their messages. This cannot be undone.`
                : "This will permanently delete the session and all its messages. This cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              ref={deleteButtonRef}
              variant="destructive"
              onClick={() => {
                if (!deleteTarget) return
                if (deleteTarget.type === "employee" && deleteTarget.sessions) {
                  handleDeleteEmployee(deleteTarget.id, deleteTarget.sessions)
                } else {
                  handleDelete(deleteTarget.id)
                }
                setDeleteTarget(null)
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes sidebar-pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.55;
            transform: scale(0.85);
          }
        }
      `}</style>
    </div>
  )
}
