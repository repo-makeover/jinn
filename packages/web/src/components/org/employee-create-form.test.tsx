import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

vi.mock("@/components/chat/model-selector-row", () => ({
  ModelSelectorRow: () => null,
}))

const createEmployee = vi.fn()
const getOrg = vi.fn()
vi.mock("@/lib/api", () => ({
  api: {
    createEmployee: (...a: unknown[]) => createEmployee(...a),
    getOrg: (...a: unknown[]) => getOrg(...a),
  },
}))

import { EmployeeCreateForm } from "./employee-create-form"

const createBtn = () => screen.getByRole("button", { name: /Create agent|Creating/ }) as HTMLButtonElement

beforeEach(() => {
  createEmployee.mockReset()
  getOrg.mockReset()
  getOrg.mockResolvedValue({ departments: ["platform"], employees: [{ name: "jinn" }] })
})

describe("EmployeeCreateForm", () => {
  it("disables create until required fields are present", () => {
    render(<EmployeeCreateForm onCancel={() => {}} onCreated={() => {}} />)
    expect(createBtn().disabled).toBe(true)

    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Platform Lead" } })
    fireEvent.change(screen.getByLabelText("Department"), { target: { value: "platform" } })
    fireEvent.change(screen.getByLabelText("Persona / instructions"), { target: { value: "Lead platform work." } })

    expect(createBtn().disabled).toBe(false)
  })

  it("creates an agent and returns the created employee", async () => {
    const onCreated = vi.fn()
    createEmployee.mockResolvedValue({
      status: "ok",
      employee: {
        name: "platform-lead",
        displayName: "Platform Lead",
        department: "platform",
        rank: "manager",
        engine: "claude",
        model: "sonnet",
        persona: "Lead platform work.",
      },
    })

    render(<EmployeeCreateForm onCancel={() => {}} onCreated={onCreated} />)

    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Platform Lead" } })
    fireEvent.change(screen.getByLabelText("Department"), { target: { value: "platform" } })
    fireEvent.change(screen.getByLabelText("Persona / instructions"), { target: { value: "Lead platform work." } })
    fireEvent.click(createBtn())

    await waitFor(() => expect(createEmployee).toHaveBeenCalledTimes(1))
    expect(createEmployee).toHaveBeenCalledWith(expect.objectContaining({
      name: "platform-lead",
      department: "platform",
      persona: "Lead platform work.",
    }))
    await waitFor(() => expect(onCreated).toHaveBeenCalled())
  })
})
