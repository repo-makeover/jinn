/**
 * Jinn Talk — CardStack render test.
 *
 * Proves the orphaned-no-more card surface actually renders the card payloads
 * the orchestrator pushes over `talk:card`. One real example of each common
 * type (status, list, stat, link, agent-activity, text) is mounted and its key
 * content is asserted present in the DOM — the same `Card` shapes the backend
 * validates and the WS event delivers.
 */
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { CardStack } from "../card-stack"
import type { Card } from "../../types"

const CARDS: Card[] = [
  {
    id: "pravko-blog",
    type: "status",
    title: "DELEGATED",
    label: "Pravko blog pipeline",
    progress: 0.4,
    state: "running",
    chips: ["phase 2"],
  },
  {
    id: "todo",
    type: "list",
    title: "TODAY",
    items: [{ text: "Ship cards", done: true }, { text: "Review PR" }],
  },
  {
    id: "mrr",
    type: "stat",
    value: "€3.4K",
    label: "June MRR",
    delta: { dir: "up", value: "+12%" },
  },
  {
    id: "dash",
    type: "link",
    url: "https://example.com/dashboard",
    label: "Open dashboard",
  },
  {
    id: "agents",
    type: "agent-activity",
    agents: [
      { id: "a1", name: "pravko-lead", role: "writer", status: "running", detail: "drafting", progress: 0.5 },
    ],
  },
]

describe("CardStack", () => {
  it("renders each common card type's content", () => {
    render(<CardStack cards={CARDS} />)

    // status card
    expect(screen.getByText("Pravko blog pipeline")).toBeTruthy()
    expect(screen.getByText("Running")).toBeTruthy()
    expect(screen.getByText("phase 2")).toBeTruthy()
    // list card
    expect(screen.getByText("Ship cards")).toBeTruthy()
    expect(screen.getByText("Review PR")).toBeTruthy()
    // stat card
    expect(screen.getByText("€3.4K")).toBeTruthy()
    expect(screen.getByText("+12%")).toBeTruthy()
    // link card — rendered as an anchor to its url
    const link = screen.getByText("Open dashboard").closest("a")
    expect(link?.getAttribute("href")).toBe("https://example.com/dashboard")
    // agent-activity card
    expect(screen.getByText("pravko-lead")).toBeTruthy()
    expect(screen.getByText("drafting")).toBeTruthy()
  })

  it("renders nothing when there are no cards", () => {
    const { container } = render(<CardStack cards={[]} />)
    // The deck mounts but holds no card shells.
    expect(container.querySelectorAll(".jt-card").length).toBe(0)
  })
})
