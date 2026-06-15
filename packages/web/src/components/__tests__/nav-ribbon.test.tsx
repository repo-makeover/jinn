import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { NavRibbon } from "../pill-nav"
import { NAV_ITEMS } from "@/lib/nav"

function renderRibbon(props: { listOpen: boolean; path?: string }) {
  return render(
    <MemoryRouter initialEntries={[props.path ?? "/"]}>
      <NavRibbon listOpen={props.listOpen} onToggleList={vi.fn()} />
    </MemoryRouter>,
  )
}

describe("NavRibbon", () => {
  it("renders the toggle with a state-aware label", () => {
    const { rerender } = renderRibbon({ listOpen: true })
    expect(screen.getByLabelText("Hide chats")).toBeTruthy()
    rerender(
      <MemoryRouter initialEntries={["/"]}>
        <NavRibbon listOpen={false} onToggleList={vi.fn()} />
      </MemoryRouter>,
    )
    const toggle = screen.getByLabelText("Show chats")
    expect(toggle.getAttribute("aria-expanded")).toBe("false")
  })

  it("renders every nav item as a labelled link", () => {
    renderRibbon({ listOpen: true })
    for (const item of NAV_ITEMS) {
      const link = screen.getByLabelText(item.label)
      expect(link.getAttribute("href")).toBe(item.href)
    }
  })

  it("marks the active route with aria-current and a non-accent fill", () => {
    renderRibbon({ listOpen: true, path: "/org" })
    const active = screen.getByLabelText("Organization")
    expect(active.getAttribute("aria-current")).toBe("page")
    // Selection is accent-independent: a soft --fill-secondary, never --accent.
    expect(active.className).toContain("fill-secondary")
    expect(active.className).not.toContain("--accent")
    // A non-active item carries no aria-current.
    expect(screen.getByLabelText("Cron").getAttribute("aria-current")).toBeNull()
  })
})
