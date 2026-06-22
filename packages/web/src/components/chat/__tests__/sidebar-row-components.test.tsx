import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ContactRow, SectionLabel, StatusDot } from "../sidebar-row-components"

describe("sidebar row components", () => {
  it("renders a section label with its count", () => {
    render(<SectionLabel label="Managers" count={3} />)

    expect(screen.getByText("Managers")).toBeTruthy()
    expect(screen.getByText("3")).toBeTruthy()
  })

  it("exposes the status dot label for assistive text when present", () => {
    render(<StatusDot color="red" pulse title="running" />)

    expect(screen.getByLabelText("running")).toBeTruthy()
  })

  it("starts a contact chat with the selected employee", () => {
    const onContact = vi.fn()

    render(
      <ContactRow
        emp={{
          name: "jinn",
          displayName: "Jinn Dev",
          department: "platform",
          rank: "employee",
          engine: "claude",
          model: "opus",
          persona: "",
        }}
        onContact={onContact}
      />,
    )

    fireEvent.click(screen.getByTitle("Start a chat with Jinn Dev"))
    expect(onContact).toHaveBeenCalledWith("jinn")
  })
})
