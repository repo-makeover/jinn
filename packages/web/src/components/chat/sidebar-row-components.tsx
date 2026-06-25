import React from "react"
import { ChevronDown, EllipsisVertical, Pin, Plus } from "lucide-react"
import type { Employee } from "@/lib/api"
import { EmployeeAvatar } from "@/components/ui/employee-avatar"
import { cleanPreview } from "@/lib/clean-preview"
import { cn } from "@/lib/utils"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  formatTime,
  getSessionActivity,
  getStatusDot,
  titleCase,
} from "./sidebar-session-helpers"
import type { FlatItem, Session } from "./sidebar-types"

export interface SidebarDeleteTarget {
  type: "session" | "employee"
  id: string
  label: string
  sessions?: Session[]
}

export interface SidebarSharedRowProps {
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
  setDeleteTarget: (target: SidebarDeleteTarget | null) => void
  setRenamingSessionId: (id: string | null) => void
  updateSessionTitle: (id: string, title: string) => void
}

export interface SidebarEmployeeRowProps extends SidebarSharedRowProps {
  item: FlatItem
  expanded: Record<string, boolean>
  handleMarkAllRead: (sessions: Session[]) => void
  handleEmployeeClick: (item: FlatItem) => void
  onLoadMore: (groupKey: string, offset: number) => void
  loadingMore: Set<string>
}

export function StatusDot({
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

export const SECTION_LABEL_CLASS =
  "text-[11px] font-[var(--weight-medium)] tracking-[0.06em] text-[var(--text-tertiary)]"
export const SECTION_COUNT_CLASS = "text-[10px] tabular-nums text-[var(--text-quaternary)]"

export function SectionLabel({
  label,
  count,
}: {
  label: string
  count?: number
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <span className={SECTION_LABEL_CLASS}>{label}</span>
      {typeof count === "number" ? (
        <span className={cn("ml-auto", SECTION_COUNT_CLASS)}>{count}</span>
      ) : null}
    </div>
  )
}

interface SessionRowProps extends SidebarSharedRowProps {
  session: Session
  parentSessions?: Session[]
}

export const SessionRow = React.memo(function SessionRow({
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
          {...(!isRenaming && {
            onClick: () => {
              onSelect(session.id)
              onEmployeeSessionsAvailable?.(parentSessions ?? [session])
            },
          })}
          className={cn(
            "group/session relative flex w-full items-center gap-2.5 border-l-2 px-4 py-2 text-left transition-colors",
            parentSessions ? "pl-11" : "pl-6",
            sessionIsActive
              ? "border-l-[var(--text-tertiary)] bg-[var(--fill-secondary)]"
              : "border-l-transparent hover:bg-[var(--fill-tertiary)]",
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
                "min-w-0 flex-1 truncate rounded border-none bg-transparent px-0.5 text-xs outline-none ring-1 ring-[var(--text-quaternary)]",
                sessionIsActive ? "font-semibold text-foreground" : "text-[var(--text-secondary)]",
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
                sessionIsActive ? "font-semibold text-foreground" : "text-[var(--text-secondary)]",
              )}
            >
              {cleanPreview(sessionTitle) || "Untitled"}
            </span>
          )}
          {isPinned ? (
            <Pin className="size-3 shrink-0 text-[var(--text-tertiary)] group-hover/session:lg:hidden group-has-[[data-state=open]]/session:lg:hidden" />
          ) : null}
          <span className="shrink-0 text-[10px] text-[var(--text-quaternary)] group-hover/session:lg:hidden group-has-[[data-state=open]]/session:lg:hidden">
            {sessionTime}
          </span>
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
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteTarget({ type: "session", id: session.id, label: cleanPreview(sessionTitle) || "Untitled" })}
              >
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
        <ContextMenuItem
          variant="destructive"
          onClick={() => setDeleteTarget({ type: "session", id: session.id, label: cleanPreview(sessionTitle) || "Untitled" })}
        >
          <span className="flex-1">Delete session</span>
          <kbd className="ml-auto pl-3 font-mono text-[10px] text-[var(--text-quaternary)]">⌫</kbd>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
})

interface FlatSessionRowProps extends SidebarSharedRowProps {
  session: Session
  avatarName: string
  displayName: string
}

export const FlatSessionRow = React.memo(function FlatSessionRow({
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

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            "group/flat relative flex w-full items-center gap-3 border-l-2 px-4 py-2 text-left transition-colors",
            isActive
              ? "border-l-[var(--text-tertiary)] bg-[var(--fill-secondary)]"
              : "border-l-transparent hover:bg-[var(--fill-tertiary)]",
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
                    isUnread || isActive ? "font-semibold" : "font-medium",
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
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur()
                    else if (e.key === "Escape") {
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
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteTarget({ type: "session", id: session.id, label: displayTitle })}
              >
                Delete session
              </DropdownMenuItem>
            </DropdownMenuContent>
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
        <ContextMenuItem
          variant="destructive"
          onClick={() => setDeleteTarget({ type: "session", id: session.id, label: displayTitle })}
        >
          <span className="flex-1">Delete session</span>
          <kbd className="ml-auto pl-3 font-mono text-[10px] text-[var(--text-quaternary)]">⌫</kbd>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
})

export const EmployeeRow = React.memo(function EmployeeRow({
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
}: SidebarEmployeeRowProps) {
  const empName = item.employeeName!
  const empSessions = item.sessions!
  const latestSession = empSessions[0]
  const empInfo = item.employeeData
  const displayName = empInfo?.displayName || titleCase(empName)
  const department = empInfo?.department || ""
  const timeLabel = formatTime(getSessionActivity(latestSession))
  const isActive = empSessions.some((session) => session.id === selectedId)
  const isPinned = pinnedSessions.has(item.pinKey)
  const loadedCount = empSessions.length
  const sessionCount = item.total ?? loadedCount
  const groupKey = item.groupKey ?? empName
  const isLoadingMore = loadingMore.has(groupKey)
  const isExpanded = expanded[empName] || false
  const hasUnread = empSessions.some(
    (session) => !readSessions.has(session.id) && session.status !== "running" && session.status !== "error",
  )
  const empDot = getStatusDot(latestSession, readSessions, hasUnread)

  const sessionRowProps: SidebarSharedRowProps = {
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
                : "border-l-transparent hover:bg-[var(--fill-tertiary)]",
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
                    hasUnread || isActive ? "font-semibold" : "font-medium",
                  )}
                >
                  {displayName}
                </span>
                <span className="shrink-0 text-[10px] text-[var(--text-tertiary)] group-hover/emp:lg:hidden group-has-[[data-state=open]]/emp:lg:hidden">
                  {timeLabel}
                </span>
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
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleteTarget({ type: "employee", id: empName, label: displayName, sessions: empSessions })}
                    >
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
          <ContextMenuItem
            variant="destructive"
            onClick={() => setDeleteTarget({ type: "employee", id: empName, label: displayName, sessions: empSessions })}
          >
            Delete all chats
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {isExpanded && loadedCount > 1
        ? empSessions.map((session) => (
            <SessionRow key={session.id} session={session} parentSessions={empSessions} {...sessionRowProps} />
          ))
        : null}
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

export function ContactRow({
  emp,
  onContact,
}: {
  emp: Employee
  onContact: (name: string) => void
}) {
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
