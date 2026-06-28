import React from "react"
import type { Employee } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Archive as ArchiveIcon, ChevronDown, Clock3, EllipsisVertical, Layers } from "lucide-react"
import { formatTime } from "./sidebar-session-helpers"
import { roomSelectionId } from "@/lib/rooms/grouping"
import type { ViewMode } from "./sidebar-types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ContactRow,
  EmployeeRow,
  FlatSessionRow,
  SECTION_COUNT_CLASS,
  SECTION_LABEL_CLASS,
  SectionLabel,
  SessionRow,
  type SidebarEmployeeRowProps,
  type SidebarSharedRowProps,
} from "./sidebar-row-components"
import type { ArchiveDialogTarget } from "./archive-dialog"
import type { Session } from "./sidebar-types"
import type { VirtualItem } from "./sidebar-view-model"

interface SidebarListSurfaceProps {
  loading: boolean
  search: string
  viewMode: ViewMode
  hiddenAutomated: number
  selectViewMode: (mode: ViewMode) => void
  virtualItems: VirtualItem[]
  sharedRowProps: SidebarSharedRowProps
  selectedId: string | null
  expandedRooms: Set<string>
  toggleRoomExpanded: (roomId: string) => void
  onSelectRoom?: (roomId: string) => void
  expanded: Record<string, boolean>
  handleEmployeeClick: SidebarEmployeeRowProps["handleEmployeeClick"]
  handleMarkAllRead: SidebarEmployeeRowProps["handleMarkAllRead"]
  handleLoadMore: SidebarEmployeeRowProps["onLoadMore"]
  loadingMore: Set<string>
  olderSummaryChats: number
  olderLineLabel: string
  toggleOlderExpanded: () => void
  cronCollapsed: boolean
  toggleCronCollapsed: () => void
  cronTotal: number
  cronSessionsLength: number
  cronSessions: Session[]
  setArchiveTarget: (target: ArchiveDialogTarget | null) => void
  contactableEmployees: Employee[]
  managerEmployees: Employee[]
  onContactEmployee?: (name: string) => void
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  handleListScroll: (event: React.UIEvent<HTMLDivElement>) => void
  shouldVirtualize: boolean
  totalSize: number
  virtualRows: Array<{ key: React.Key; index: number; start: number }>
  measureElement: (element: HTMLDivElement | null) => void
}

export function SidebarListSurface({
  loading,
  search,
  viewMode,
  hiddenAutomated,
  selectViewMode,
  virtualItems,
  sharedRowProps,
  selectedId,
  expandedRooms,
  toggleRoomExpanded,
  onSelectRoom,
  expanded,
  handleEmployeeClick,
  handleMarkAllRead,
  handleLoadMore,
  loadingMore,
  olderSummaryChats,
  olderLineLabel,
  toggleOlderExpanded,
  cronCollapsed,
  toggleCronCollapsed,
  cronTotal,
  cronSessionsLength,
  cronSessions,
  setArchiveTarget,
  contactableEmployees,
  managerEmployees,
  onContactEmployee,
  scrollContainerRef,
  handleListScroll,
  shouldVirtualize,
  totalSize,
  virtualRows,
  measureElement,
}: SidebarListSurfaceProps) {
  const cronHeader = (
    <div className="group/cron flex w-full items-center transition-colors hover:bg-[var(--fill-tertiary)]">
      <button
        onClick={toggleCronCollapsed}
        className="flex min-w-0 flex-1 items-center gap-2 px-4 py-2 pr-1 text-left"
      >
        <span className={SECTION_LABEL_CLASS}>Scheduled</span>
        <span className={cn("ml-auto", SECTION_COUNT_CLASS)}>{cronTotal}</span>
        <ChevronDown className={cn("size-3.5 shrink-0 text-[var(--text-quaternary)] transition-transform", cronCollapsed && "-rotate-90")} />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(event) => event.stopPropagation()}
            aria-label="Scheduled actions"
            className="mr-1 flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground lg:size-7 lg:hidden group-hover/cron:lg:flex group-has-[[data-state=open]]/cron:lg:flex"
          >
            <EllipsisVertical className="size-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => setArchiveTarget({
              kind: "scheduled",
              title: "Scheduled",
              sessionIds: cronSessions.map((session) => session.id),
              sourceRef: "scheduled",
              sessions: cronSessions,
            })}
          >
            <ArchiveIcon />
            Archive past runs...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

  const renderItem = (item: VirtualItem): React.ReactNode => {
    switch (item.kind) {
      case "section":
        return (
          <div className="flex items-center gap-2 px-4 pb-1 pt-3">
            <span className={SECTION_LABEL_CLASS}>{item.label}</span>
            {typeof item.count === "number" ? (
              <span className={SECTION_COUNT_CLASS}>{item.count}</span>
            ) : null}
          </div>
        )
      case "flat":
        return (
          <FlatSessionRow
            session={item.row.session}
            avatarName={item.row.avatarName}
            avatar={item.row.avatar}
            emoji={item.row.emoji}
            displayName={item.row.displayName}
            {...sharedRowProps}
          />
        )
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
            <span className={cn("ml-auto", SECTION_COUNT_CLASS)}>{olderSummaryChats}</span>
            <ChevronDown className="size-3.5 shrink-0 text-[var(--text-quaternary)]" />
          </button>
        )
      case "employee":
        return (
          <EmployeeRow
            item={item.item}
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
        return <SessionRow session={item.session} {...sharedRowProps} />
      case "cron-more":
        return (
          <button
            onClick={() => handleLoadMore("__cron__", cronSessionsLength)}
            disabled={loadingMore.has("__cron__")}
            className="w-full cursor-pointer px-4 pb-2 pl-11 text-left text-[10px] text-[var(--text-quaternary)] transition-colors hover:text-[var(--text-secondary)] disabled:opacity-50"
          >
            {loadingMore.has("__cron__") ? "Loading…" : `+${cronTotal - cronSessionsLength} more`}
          </button>
        )
      case "room-header": {
        const room = item.room
        const isActive = selectedId === roomSelectionId(room.id)
        const isExpanded = expandedRooms.has(room.id)
        const lastActive = formatTime(room.lastActivity)
        return (
          <div
            className={cn(
              "group/room relative flex w-full items-center border-l-2 transition-colors",
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(event) => event.stopPropagation()}
                  aria-label={`${room.name} actions`}
                  className="mr-1 flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground lg:size-7 lg:hidden group-hover/room:lg:flex group-has-[[data-state=open]]/room:lg:flex"
                >
                  <EllipsisVertical className="size-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setArchiveTarget({
                    kind: "room",
                    title: room.name,
                    sessionIds: room.sessions.map((session) => session.id),
                    sourceRef: room.id,
                    sessions: room.sessions as unknown as Session[],
                  })}
                >
                  <ArchiveIcon />
                  Archive room...
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      }
      default:
        return null
    }
  }

  const emptyState = (
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
  )

  return (
    <div className="relative min-h-0 flex-1">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-3"
        style={{ background: "linear-gradient(to bottom, var(--sidebar-bg), transparent)" }}
      />
      <div
        ref={scrollContainerRef}
        onScroll={handleListScroll}
        className="h-full overflow-y-auto pb-[calc(49px+var(--safe-bottom))] lg:pb-0"
      >
        {loading ? (
          <div className="px-4 py-8 text-center text-xs text-[var(--text-quaternary)]">
            Loading sessions...
          </div>
        ) : virtualItems.length === 0 ? (
          emptyState
        ) : shouldVirtualize ? (
          <div style={{ height: `${totalSize}px`, position: "relative" }}>
            {virtualRows.map((row) => {
              const item = virtualItems[row.index]
              return (
                <div
                  key={row.key}
                  ref={measureElement}
                  data-index={row.index}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${row.start}px)`,
                  }}
                >
                  {renderItem(item)}
                </div>
              )
            })}
          </div>
        ) : (
          <>
            {virtualItems.map((item, index) => (
              <React.Fragment
                key={
                  item.kind === "flat" ? item.row.session.id
                  : item.kind === "employee" ? item.item.pinKey
                  : item.kind === "cron-session" ? item.session.id
                  : item.kind === "section" ? `section:${item.id}`
                  : `${item.kind}:${index}`
                }
              >
                {renderItem(item)}
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
            {contactableEmployees.map((employee) => (
              <ContactRow key={employee.name} emp={employee} onContact={onContactEmployee} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
