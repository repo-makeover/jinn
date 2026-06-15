import { Link, useLocation } from "react-router-dom"
import { isNavItemActive } from "@/components/pill-nav"
import { MOBILE_TAB_ITEMS } from "@/lib/nav"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// MobileTabBar — the iOS-style bottom tab bar for the curated 5 (MOBILE_TAB_ITEMS).
// Mobile only (lg:hidden); the parent decides when to mount it. Frosted material
// over content with the single 0.5px top hairline iOS tab bars are allowed (the
// one exception to "no hairlines at rest"). Active state uses --fill-secondary
// behind the icon only — never --accent.
// ---------------------------------------------------------------------------

export function MobileTabBar() {
  const pathname = useLocation().pathname

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 lg:hidden",
        "flex items-stretch",
        "border-t-[0.5px] border-[var(--separator)] bg-[var(--material-thick)]",
        "[backdrop-filter:blur(20px)_saturate(1.3)] [-webkit-backdrop-filter:blur(20px)_saturate(1.3)]",
        "pt-1 pb-[var(--safe-bottom)]",
      )}
    >
      {MOBILE_TAB_ITEMS.map((item) => {
        const isActive = isNavItemActive(item.href, pathname)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            to={item.href}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "min-h-[49px] flex-1 flex flex-col items-center justify-center gap-0.5",
              "transition-colors",
              isActive
                ? "text-[var(--text-primary)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]",
            )}
          >
            <span
              className={cn(
                "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                isActive && "bg-[var(--fill-secondary)]",
              )}
            >
              <Icon size={22} className="shrink-0" />
            </span>
            <span className="text-[10px] font-medium leading-none">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
