import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { EmployeeAvatar } from "./employee-avatar"
import { emojiForName } from "@/lib/emoji-pool"

describe("EmployeeAvatar", () => {
  it("renders the org office avatar as a PNG", () => {
    render(<EmployeeAvatar name="parliamentarian" avatar="office:pencil" />)

    const img = screen.getByRole("img", { name: "parliamentarian" })
    expect(img.getAttribute("src")).toBe("/avatars/office/64/pencil.png")
  })

  it("renders a persisted plain emoji when no avatar is set", () => {
    render(<EmployeeAvatar name="assistant" emoji="🦊" />)

    expect(screen.queryByRole("img")).toBeNull()
    expect(screen.getByText("🦊")).toBeTruthy()
  })

  it("falls back to a deterministic emoji when no icon is set", () => {
    render(<EmployeeAvatar name="nobody" />)

    expect(screen.queryByRole("img")).toBeNull()
    expect(screen.getByText(emojiForName("nobody"))).toBeTruthy()
  })

  it("prefers the office avatar over a plain emoji when both are set", () => {
    render(<EmployeeAvatar name="both" avatar="office:notebook" emoji="🦊" />)

    const img = screen.getByRole("img", { name: "both" })
    expect(img.getAttribute("src")).toBe("/avatars/office/64/notebook.png")
    expect(screen.queryByText("🦊")).toBeNull()
  })
})
