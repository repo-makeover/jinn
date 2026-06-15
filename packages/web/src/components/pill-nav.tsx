import { useEffect, useState, type ComponentType, type ReactNode } from "react"
import { Link, useLocation } from "react-router-dom"
import { Menu, Sun, Moon, Palette, ArrowLeftRight, PanelLeft } from "lucide-react"
import { useTheme } from "@/routes/providers"
import { THEMES, type ThemeId } from "@/lib/themes"
import { NAV_ITEMS } from "@/lib/nav"
import { useBreadcrumbs } from "@/context/breadcrumb-context"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Frosted pill primitives (mockup _shared.css `.pill` recipe)
// ---------------------------------------------------------------------------
// backdrop-blur(20px) saturate(1.3) over a theme-aware translucent material,
// 0.5px theme-aware border (the shadow's built-in ring, NOT a hairline at rest),
// overlay shadow, full radius. Material + border flip with the active theme via
// --pill-bg / --pill-border (globals.css). The cross-page pill system and the
// chat header pills share this single primitive.
export const PILL_CLASS =
  "pointer-events-auto inline-flex items-center gap-0.5 rounded-full border-[0.5px] border-[var(--pill-border)] " +
  "bg-[var(--pill-bg)] p-1 shadow-[var(--shadow-overlay)] " +
  "[backdrop-filter:blur(20px)_saturate(1.3)] [-webkit-backdrop-filter:blur(20px)_saturate(1.3)]"

// The nav popover reuses the EXACT pill material — same translucent fill, 0.5px
// ring, blur and overlay shadow — only the radius differs (panel, not pill).
const POPOVER_CLASS =
  "rounded-[var(--radius-lg)] border-[0.5px] border-[var(--pill-border)] " +
  "bg-[var(--pill-bg)] shadow-[var(--shadow-overlay)] " +
  "[backdrop-filter:blur(20px)_saturate(1.3)] [-webkit-backdrop-filter:blur(20px)_saturate(1.3)]"

export function PillButton({
  onClick,
  title,
  ariaLabel,
  ariaExpanded,
  className,
  children,
}: {
  onClick?: () => void
  title?: string
  ariaLabel?: string
  ariaExpanded?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      className={cn(
        // 36px tap target at base (Apple HIG floor); tighten to 32px on desktop.
        "inline-flex size-9 lg:size-8 shrink-0 items-center justify-center rounded-full transition-colors",
        "text-[var(--text-secondary)]",
        "hover:bg-[var(--fill-secondary)] hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Nav primitives — shared by the popover (non-chat pages) AND the chat route's
// in-surface list⇄nav swap, so the nav links read identically everywhere.
// ---------------------------------------------------------------------------

/** The single active-route rule used across the rail, drawer, popover and pill. */
export function isNavItemActive(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href)
}

export function NavList({
  pathname,
  onNavigate,
}: {
  pathname: string
  onNavigate?: () => void
}) {
  return (
    <div className="flex flex-col gap-0.5 p-1.5">
      {NAV_ITEMS.map((item) => {
        const isActive = isNavItemActive(item.href, pathname)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex h-10 items-center gap-3 rounded-[10px] px-3 text-[length:var(--text-subheadline)] transition-colors",
              isActive
                ? "bg-[var(--fill-secondary)] font-[var(--weight-semibold)] text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--fill-secondary)] hover:text-[var(--text-primary)]",
            )}
          >
            <Icon size={18} className="shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}

function ThemeIcon({ theme }: { theme: ThemeId }) {
  if (theme === "light") return <Sun size={18} />
  if (theme === "dark") return <Moon size={18} />
  return <Palette size={18} />
}

interface InstanceInfo {
  name: string
  port: number
  running: boolean
  current: boolean
}

/** Footer for the nav surface — the theme toggle + (when >1) instance switcher.
 *  Re-homed verbatim from the retired rail so nothing is lost. Used by the
 *  popover and the chat in-surface nav swap. */
export function NavFooter() {
  const { theme, setTheme } = useTheme()
  const [instances, setInstances] = useState<InstanceInfo[]>([])

  useEffect(() => {
    fetch("/api/instances")
      .then((r) => r.json())
      .then(setInstances)
      .catch(() => {})
  }, [])

  function cycleTheme() {
    const ids = THEMES.map((t) => t.id)
    const idx = ids.indexOf(theme)
    setTheme(ids[(idx + 1) % ids.length])
  }

  return (
    <div className="flex flex-col gap-0.5 p-1.5 pt-0">
      {instances.length > 1 && (
        <>
          <div className="flex items-center gap-1.5 px-3 pb-0.5 pt-1.5 text-[length:var(--text-caption2)] font-[var(--weight-bold)] uppercase tracking-[0.4px] text-[var(--text-quaternary)]">
            <ArrowLeftRight size={11} className="shrink-0" />
            Instances
          </div>
          {instances.map((inst) => (
            <button
              key={inst.port}
              onClick={() => {
                if (!inst.current && inst.running) {
                  window.location.href = `http://localhost:${inst.port}/chat`
                }
              }}
              className={cn(
                "flex h-9 w-full items-center justify-between rounded-[10px] px-3 text-left text-[length:var(--text-footnote)] transition-colors",
                inst.current
                  ? "bg-[var(--fill-secondary)] font-[var(--weight-semibold)] text-[var(--text-primary)]"
                  : inst.running
                    ? "text-[var(--text-secondary)] hover:bg-[var(--fill-secondary)] hover:text-[var(--text-primary)]"
                    : "cursor-default text-[var(--text-quaternary)]",
              )}
            >
              <span className="truncate">{inst.name}</span>
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: inst.running ? "var(--system-green)" : "var(--text-quaternary)" }}
              />
            </button>
          ))}
          <div className="mx-2 my-1 h-px bg-[var(--separator)]" />
        </>
      )}
      <button
        onClick={cycleTheme}
        aria-label={`Theme: ${theme}. Click to cycle.`}
        className="flex h-10 w-full items-center gap-3 rounded-[10px] px-3 text-[length:var(--text-subheadline)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--fill-secondary)] hover:text-[var(--text-primary)]"
      >
        <span className="shrink-0">
          <ThemeIcon theme={theme} />
        </span>
        <span className="capitalize">{theme}</span>
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// NavRibbon — the chat route's permanent slim icon rail (~56px). Always mounted
// (desktop only); the toggle at its top folds/unfolds the 280px chat list, so
// nav never leaves the rail. Icons-only at rest with tooltips; on hover/focus
// the rail widens to reveal labels (an overlay — it floats over the list rather
// than reflowing it). Active item = soft --fill-secondary, NEVER --accent.
// ---------------------------------------------------------------------------

/** One ribbon entry: a 44px icon square at rest that grows to a full labeled row
 *  when the rail expands. Icon x-position is identical in both states (the label
 *  area is simply clipped at rest), so expanding reads as the rail breathing. */
function RibbonRow({
  Icon,
  label,
  isActive,
  href,
  onClick,
}: {
  Icon: ComponentType<{ size?: number | string; className?: string }>
  label: string
  isActive?: boolean
  href?: string
  onClick?: () => void
}) {
  const cls = cn(
    "flex h-11 w-11 shrink-0 items-center overflow-hidden rounded-[12px] transition-[width,color,background-color] duration-200 [transition-timing-function:var(--ease-smooth)] motion-reduce:transition-none",
    "group-hover/ribbon:w-[224px] group-focus-within/ribbon:w-[224px]",
    isActive
      ? "bg-[var(--fill-secondary)] text-[var(--text-primary)]"
      : "text-[var(--text-secondary)] hover:bg-[var(--fill-secondary)] hover:text-[var(--text-primary)]",
  )
  const inner = (
    <>
      <span className="flex size-11 shrink-0 items-center justify-center">
        <Icon size={20} className="shrink-0" />
      </span>
      <span className="truncate pr-3 text-[length:var(--text-subheadline)] font-[var(--weight-medium)] opacity-0 transition-opacity duration-150 group-hover/ribbon:opacity-100 group-focus-within/ribbon:opacity-100 motion-reduce:transition-none">
        {label}
      </span>
    </>
  )
  if (href) {
    return (
      <Link
        to={href}
        onClick={onClick}
        aria-label={label}
        aria-current={isActive ? "page" : undefined}
        title={label}
        className={cls}
      >
        {inner}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={cls}>
      {inner}
    </button>
  )
}

/** The chat ribbon. `listOpen` + `onToggleList` drive the chat-list fold. */
export function NavRibbon({
  listOpen,
  onToggleList,
}: {
  listOpen: boolean
  onToggleList: () => void
}) {
  const pathname = useLocation().pathname
  const { theme, setTheme } = useTheme()
  const cycleTheme = () => {
    const ids = THEMES.map((t) => t.id)
    setTheme(ids[(ids.indexOf(theme) + 1) % ids.length])
  }
  return (
    // The placeholder reserves the collapsed width (w-14 = 56px) in the flex row;
    // the real rail floats above it and expands over the list on hover/focus.
    <div className="relative hidden h-full w-14 shrink-0 lg:block">
      <div
        className="group/ribbon absolute inset-y-0 left-0 z-30 flex w-14 flex-col overflow-hidden bg-[var(--sidebar-bg)] py-2.5 transition-[width,background-color,box-shadow] duration-200 [transition-timing-function:var(--ease-smooth)] hover:w-[236px] hover:bg-[var(--bg-secondary)] hover:shadow-[var(--shadow-overlay)] focus-within:w-[236px] focus-within:bg-[var(--bg-secondary)] focus-within:shadow-[var(--shadow-overlay)] motion-reduce:transition-none"
      >
        {/* Toggle — same frosted pill material as the header pills, pinned to the
            rail top so it is always in-rail and never floats over the thread. */}
        <div className="px-1.5">
          <span className={cn(PILL_CLASS, "w-fit")}>
            <PillButton
              onClick={onToggleList}
              title={listOpen ? "Hide chats" : "Show chats"}
              ariaLabel={listOpen ? "Hide chats" : "Show chats"}
              ariaExpanded={listOpen}
            >
              <PanelLeft size={18} />
            </PillButton>
          </span>
        </div>

        {/* Nav icons — icon-only at rest, labeled on hover/focus. */}
        <nav aria-label="Primary" className="mt-2 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1.5">
          {NAV_ITEMS.map((item) => (
            <RibbonRow
              key={item.href}
              Icon={item.icon}
              label={item.label}
              href={item.href}
              isActive={isNavItemActive(item.href, pathname)}
            />
          ))}
        </nav>

        {/* Footer — theme toggle, pinned to the bottom. */}
        <div className="px-1.5 pt-1">
          <RibbonRow Icon={themeGlyph(theme)} label={`Theme: ${theme}`} onClick={cycleTheme} />
        </div>
      </div>
    </div>
  )
}

function themeGlyph(theme: ThemeId): ComponentType<{ size?: number | string; className?: string }> {
  if (theme === "light") return Sun
  if (theme === "dark") return Moon
  return Palette
}

/** Frosted nav popover anchored under the left pill — non-chat pages reach the
 *  global nav here (the chat route swaps its left surface in place instead). */
export function NavPopover({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = useLocation().pathname
  if (!open) return null
  return (
    <>
      {/* Click-away scrim (transparent — the popover floats over content). */}
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <div
        className={cn(
          "absolute left-[max(var(--safe-left),12px)] top-[calc(max(var(--safe-top),12px)+46px)] z-50 w-[244px] lg:left-4 lg:top-[52px]",
          POPOVER_CLASS,
        )}
        style={{ animation: "pillNavIn 160ms var(--ease-smooth)" }}
        role="menu"
      >
        <NavList pathname={pathname} onNavigate={onClose} />
        <div className="mx-2 h-px bg-[var(--separator)]" />
        <NavFooter />
      </div>
      <style>{`
        @keyframes pillNavIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}

// ---------------------------------------------------------------------------
// PillNav — the pinned two-pill page chrome rendered by PageLayout for every
// non-chat route. LEFT pill = nav button (opens the popover) + route icon +
// page title (from the breadcrumb provider). RIGHT pill = page actions, and is
// absent entirely when a page has none (clean corner).
// ---------------------------------------------------------------------------

export function PillNav({ actions }: { actions?: ReactNode }) {
  const pathname = useLocation().pathname
  const { items } = useBreadcrumbs()
  const [navOpen, setNavOpen] = useState(false)

  const title = items[0]?.label ?? ""
  const navItem = NAV_ITEMS.find((n) => isNavItemActive(n.href, pathname))
  const RouteIcon = navItem?.icon

  return (
    <>
      {/* LEFT pill — nav button + route icon + page title. */}
      <div className="pointer-events-none absolute left-[max(var(--safe-left),12px)] top-[max(var(--safe-top),12px)] z-40 lg:left-4 lg:top-4">
        <div className={PILL_CLASS}>
          <PillButton
            onClick={() => setNavOpen((o) => !o)}
            title="Menu"
            ariaLabel="Open navigation"
            ariaExpanded={navOpen}
          >
            <Menu size={17} />
          </PillButton>
          {title && (
            <span className="flex select-none items-center gap-1.5 pl-0.5 pr-2.5 text-[length:var(--text-subheadline)] font-[var(--weight-semibold)] text-[var(--text-primary)]">
              {RouteIcon && <RouteIcon size={15} className="shrink-0 text-[var(--text-tertiary)]" />}
              <span className="truncate max-w-[42vw]">{title}</span>
            </span>
          )}
        </div>
      </div>

      <NavPopover open={navOpen} onClose={() => setNavOpen(false)} />

      {/* RIGHT pill — only when the page provides actions. */}
      {actions && (
        <div className="pointer-events-none absolute right-[max(var(--safe-right),12px)] top-[max(var(--safe-top),12px)] z-40 lg:right-4 lg:top-4">
          <div className={PILL_CLASS}>{actions}</div>
        </div>
      )}
    </>
  )
}
