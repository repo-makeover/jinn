import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { ThreadCard } from "../thread-card"
import type { GraphNode } from "../graph-store"

const node = (over: Partial<GraphNode>): GraphNode => ({
  id: "t1",
  parentId: "root",
  depth: 1,
  label: "Movekit Lead",
  employee: null,
  status: "running",
  lastActivity: "2026-06-11T00:00:00Z",
  ...over,
})

describe("ThreadCard", () => {
  it("renders route, brief, live activity and status", () => {
    const graph = [node({ briefExcerpt: "Audit the funnel" })]
    const activity = new Map([["t1", { activity: "reading…" }]])
    render(<ThreadCard threadId="t1" graph={graph} activity={activity} fallbackLabel="Movekit Lead" />)
    expect(screen.getByText(/AURA → Movekit Lead/)).toBeTruthy()
    expect(screen.getByText(/Audit the funnel/)).toBeTruthy()
    expect(screen.getByText("reading…")).toBeTruthy()
    expect(screen.getByText("working")).toBeTruthy()
  })

  it("renders nested sub-thread rows from the graph, indented by depth", () => {
    const graph = [
      node({}),
      node({ id: "g1", parentId: "t1", depth: 2, label: "Funnel Analyst", status: "running" }),
      node({ id: "gg1", parentId: "g1", depth: 3, label: "Query Runner", status: "idle" }),
    ]
    render(<ThreadCard threadId="t1" graph={graph} activity={new Map()} fallbackLabel="Movekit Lead" />)
    expect(screen.getByText(/Funnel Analyst/)).toBeTruthy()
    expect(screen.getByText(/Query Runner/)).toBeTruthy()
    const rows = screen.getAllByRole("button", { name: /open thread/i })
    expect(rows.length).toBeGreaterThanOrEqual(3) // head + 2 sub-rows
  })

  it("shows the report excerpt and settles when completed", () => {
    const graph = [node({ status: "idle" })]
    const activity = new Map([["t1", { reportExcerpt: "Funnel audit done: 3 fixes." }]])
    const { container } = render(
      <ThreadCard threadId="t1" graph={graph} activity={activity} fallbackLabel="Movekit Lead" />,
    )
    expect(screen.getByText(/Funnel audit done/)).toBeTruthy()
    expect(container.querySelector(".tcard")?.getAttribute("data-status")).toBe("done")
  })

  it("opens the thread on click", () => {
    const onOpenThread = vi.fn()
    render(
      <ThreadCard
        threadId="t1"
        graph={[node({})]}
        activity={new Map()}
        fallbackLabel="L"
        onOpenThread={onOpenThread}
      />,
    )
    fireEvent.click(screen.getAllByRole("button", { name: /open thread/i })[0])
    expect(onOpenThread).toHaveBeenCalledWith("t1")
  })

  it("renders a settled fallback when the node is gone from the graph", () => {
    render(<ThreadCard threadId="zz" graph={[]} activity={new Map()} fallbackLabel="Old Thread" />)
    expect(screen.getByText(/AURA → Old Thread/)).toBeTruthy()
  })
})
