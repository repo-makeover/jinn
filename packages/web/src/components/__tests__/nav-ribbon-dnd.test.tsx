import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { NavRibbon } from "../pill-nav"
import { SettingsProvider } from "@/routes/settings-provider"

vi.mock("@/lib/api", () => ({ api: { getOnboarding: () => Promise.resolve({}) } }))

function renderRibbon() {
  return render(
    <SettingsProvider>
      <MemoryRouter initialEntries={["/"]}>
        <NavRibbon listOpen onToggleList={vi.fn()} />
      </MemoryRouter>
    </SettingsProvider>,
  )
}

/** jsdom's DataTransfer is incomplete; a Map-backed stub shared across the
 *  dragstart → dragover → drop sequence round-trips setData/getData. */
function makeDataTransfer(): DataTransfer {
  const store = new Map<string, string>()
  return {
    dropEffect: "none",
    effectAllowed: "all",
    setData: (type: string, value: string) => store.set(type, value),
    getData: (type: string) => store.get(type) ?? "",
  } as unknown as DataTransfer
}

function railLabels(): (string | null)[] {
  const nav = screen.getByRole("navigation", { name: "Primary" })
  return within(nav).getAllByRole("link").map((link) => link.getAttribute("aria-label"))
}

describe("NavRibbon drag-to-reorder", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("reorders the rail on drag-and-drop and persists the new order", () => {
    renderRibbon()

    let labels = railLabels()
    expect(labels.indexOf("Settings")).toBeGreaterThan(labels.indexOf("Organization"))

    const dt = makeDataTransfer()
    fireEvent.dragStart(screen.getByLabelText("Settings"), { dataTransfer: dt })
    fireEvent.dragOver(screen.getByLabelText("Organization"), { dataTransfer: dt, clientY: 0 })
    fireEvent.drop(screen.getByLabelText("Organization"), { dataTransfer: dt })

    labels = railLabels()
    expect(labels.indexOf("Settings")).toBeLessThan(labels.indexOf("Organization"))

    const saved = JSON.parse(localStorage.getItem("jinn-settings")!)
    expect(Array.isArray(saved.navOrder)).toBe(true)
    expect(saved.navOrder.indexOf("/settings")).toBeLessThan(saved.navOrder.indexOf("/org"))
    expect(saved.navOrder).not.toContain("/talk")
  })

  it("restores a persisted custom order on a fresh mount (reload path)", async () => {
    localStorage.setItem("jinn-settings", JSON.stringify({ navOrder: ["/settings"] }))
    renderRibbon()

    await waitFor(() => {
      const labels = railLabels()
      expect(labels.indexOf("Settings")).toBeLessThan(labels.indexOf("Organization"))
    })
  })

  it("keeps Talk docked below the main icons even after a reorder", () => {
    renderRibbon()
    const dt = makeDataTransfer()
    fireEvent.dragStart(screen.getByLabelText("Settings"), { dataTransfer: dt })
    fireEvent.dragOver(screen.getByLabelText("Organization"), { dataTransfer: dt, clientY: 0 })
    fireEvent.drop(screen.getByLabelText("Organization"), { dataTransfer: dt })

    const labels = railLabels()
    expect(labels.indexOf("Talk")).toBeGreaterThan(labels.indexOf("Settings"))
  })
})
