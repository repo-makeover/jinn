
import React, { useEffect, useState, useRef, useCallback, useMemo, startTransition } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useQueryClient } from "@tanstack/react-query"
import { Archive as ArchiveIcon, ChevronDown, Clock3, EllipsisVertical, Layers, Search, X } from "lucide-react"
import { api, type BackgroundActivity, type Employee, type SessionsResponse } from "@/lib/api"
import { useOrg } from "@/hooks/use-employees"
import { useSettings } from "@/routes/settings-provider"
import { queryKeys } from "@/lib/query-keys"
import { useSessions, useSessionCounts, useSessionSearch, useUpdateSession, useDeleteSession, useBulkDeleteSessions, useDuplicateSession } from "@/hooks/use-sessions"
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
import { groupSessionsByDepartment, roomSelectionId } from "@/lib/rooms/grouping"
import type { DepartmentRoom, RoomEmployee, RoomSession } from "@/lib/rooms/types"
import type { Session, SidebarOrder, FlatItem, ViewMode } from "./sidebar-types"
import {
  loadExpandedRooms, saveExpandedRooms, getReadSessions, markSessionRead, markAllReadForEmployee,
  getPinnedSessions, savePinnedSessions, loadCollapsedState, saveCollapsedState,
  loadExpandedState, saveExpandedState,
} from "./sidebar-storage"
import {
  formatTime, isCronSession, hasBackgroundActivity, isRecentError,
} from "./sidebar-session-helpers"
import { ArchiveDialog, type ArchiveDialogTarget } from "./archive-dialog"
import {
  ContactRow,
  EmployeeRow,
  FlatSessionRow,
  SectionLabel,
  SECTION_COUNT_CLASS,
  SECTION_LABEL_CLASS,
  SessionRow,
  type SidebarDeleteTarget,
  type SidebarSharedRowProps,
} from "./sidebar-row-components"
import {
  buildContactableEmployees,
  buildManagerEmployees,
  buildSidebarCollections,
  buildSidebarOrder,
  buildVirtualItems,
  buildVisibleSessions,
  CRON_GROUP,
  formatOlderLineLabel,
  type VirtualItem,
  VIRTUALIZE_THRESHOLD,
} from "./sidebar-view-model"

// Compatibility facade: these moved to ./sidebar-types and ./sidebar-session-helpers
// (AS-001 modularization) — re-exported so existing importers of this module
// (chat/page.tsx, chat-sidebar-helpers.test.ts) keep working.
export type { SidebarOrder }
export { hasBackgroundActivity, isDirectSession, isRecentError, resolveRowIdentity } from "./sidebar-session-helpers"

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

  const sessions = useMemo(
    () => buildVisibleSessions(rawSessions as Session[] | undefined),
    [rawSessions],
  )

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
  const [deleteTarget, setDeleteTarget] = useState<SidebarDeleteTarget | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<ArchiveDialogTarget | null>(null)
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

  const handleArchiveComplete = useCallback((sessionIds: string[]) => {
    setPinnedSessions((prev) => {
      let changed = false
      const next = new Set(prev)
      for (const id of sessionIds) {
        if (next.delete(id)) changed = true
      }
      if (archiveTarget?.kind === "room" && archiveTarget.sourceRef) {
        if (next.delete(`room:${archiveTarget.sourceRef}`)) changed = true
      }
      if (changed) savePinnedSessions(next)
      return changed ? next : prev
    })

    startTransition(() => {
      const archivedSelectedSession = !!selectedId && sessionIds.includes(selectedId)
      const archivedSelectedRoom =
        archiveTarget?.kind === "room" &&
        !!archiveTarget.sourceRef &&
        selectedId === roomSelectionId(archiveTarget.sourceRef)
      if (archivedSelectedSession || archivedSelectedRoom) onNewChat()
    })
  }, [archiveTarget, selectedId, onNewChat])

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
  } = useMemo(() => buildSidebarCollections({
    sessions,
    search,
    searchResults: searchResults as Session[] | undefined,
    employeeData,
    portalSlug,
    portalName,
    pinnedSessions,
    counts,
    viewMode,
  }), [sessions, search, searchResults, employeeData, portalSlug, portalName, pinnedSessions, counts, viewMode])

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
    return buildContactableEmployees({
      search,
      pinnedFlat,
      unpinnedFlat,
      orgEmployees: orgData?.employees ?? [],
      employeeData,
      portalSlug,
    })
  }, [search, pinnedFlat, unpinnedFlat, orgData, employeeData, portalSlug])

  // Managers + executives — a quick-access roster rendered ABOVE Team. Shown
  // regardless of whether they already have sessions (so all leadership is one
  // tap away); they may also appear in Team. Executives first, then by name.
  // Hidden during search (the flat results span everything already).
  const managerEmployees = useMemo(() => {
    return buildManagerEmployees({
      search,
      orgEmployees: orgData?.employees ?? [],
      portalSlug,
    })
  }, [search, orgData, portalSlug])

  // Emit flat session order for keyboard navigation (J/K/E shortcuts).
  // Visual order: Today → Yesterday → (Older drawer, if open) → Scheduled.
  // De-duped — an employee's older sessions can overlap their Today/Yesterday rows.
  const orderRef = useRef<string>('')
  const allFlatIds = useMemo(() => buildSidebarOrder({
    searching,
    searchRows,
    viewMode,
    rooms,
    sortedCron,
    pinnedFlat,
    unpinnedFlat,
    todayRows,
    yesterdayRows,
    olderExpanded,
    olderFocusedRows,
    olderPinned,
    olderUnpinned,
    expanded,
  }), [searching, searchRows, viewMode, rooms, sortedCron, pinnedFlat, unpinnedFlat, todayRows, yesterdayRows, olderExpanded, olderFocusedRows, olderPinned, olderUnpinned, expanded])

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
  const sharedRowProps = useMemo<SidebarSharedRowProps>(() => ({
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
    setArchiveTarget,
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
  const virtualItems = useMemo<VirtualItem[]>(() => buildVirtualItems({
    searching,
    searchRows,
    viewMode,
    rooms,
    expandedRooms,
    cronSessions,
    cronCollapsed,
    sortedCron,
    cronTotal,
    todayRows,
    yesterdayRows,
    olderSummary,
    olderExpanded,
    olderFocusedRows,
    olderPinned,
    olderUnpinned,
    portalSlug,
    portalName,
    employeeData,
  }), [searching, searchRows, viewMode, rooms, expandedRooms, cronSessions, cronCollapsed, sortedCron, cronTotal, todayRows, yesterdayRows, olderSummary, olderExpanded, olderFocusedRows, olderPinned, olderUnpinned, portalSlug, portalName, employeeData])

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

  const olderLineLabel = useMemo(() => formatOlderLineLabel(olderSummary), [olderSummary])

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

      <ArchiveDialog
        target={archiveTarget}
        onOpenChange={(open) => { if (!open) setArchiveTarget(null) }}
        onArchived={handleArchiveComplete}
      />

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
