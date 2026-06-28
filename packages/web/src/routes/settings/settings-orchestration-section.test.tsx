import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { OrchestrationSection } from "./settings-config-sections"
import type { Config } from "./settings-constants"

describe("OrchestrationSection", () => {
  it("shows orchestration as locked off and does not emit edits", () => {
    const updateConfig = vi.fn()
    const updateNumberConfig = vi.fn()
    const config: Config = {
      orchestration: {
        enabled: true,
        configDir: "/tmp/orchestration",
        maxWorktrees: 12,
        sameFamilyReviewerFallback: true,
      },
    }

    render(
      <OrchestrationSection
        config={config}
        updateConfig={updateConfig}
        updateNumberConfig={updateNumberConfig}
      />,
    )

    const switches = screen.getAllByRole("switch")
    expect(switches[0].getAttribute("aria-checked")).toBe("false")
    expect((switches[0] as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByDisplayValue("/tmp/orchestration") as HTMLInputElement).disabled).toBe(true)
    expect((screen.getByDisplayValue("12") as HTMLInputElement).disabled).toBe(true)

    fireEvent.click(switches[0])

    expect(updateConfig).not.toHaveBeenCalled()
    expect(updateNumberConfig).not.toHaveBeenCalled()
    expect(screen.getByText(/legacy org structure and management flow/i)).toBeTruthy()
  })
})
