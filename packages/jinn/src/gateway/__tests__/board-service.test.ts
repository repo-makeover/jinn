import { describe, expect, it } from "vitest";
import { boardTicketComplexity, mergeBoardTickets, parseBoardWritePayload, type BoardTicket } from "../board-service.js";

function ticket(id: string, source?: string): BoardTicket {
  return {
    id,
    title: id,
    description: "",
    status: "todo",
    priority: "medium",
    assignee: "a",
    source,
    sessionId: source === "session" ? id : undefined,
    createdAt: "2026-06-22T00:00:00.000Z",
    updatedAt: "2026-06-22T00:00:00.000Z",
  };
}

describe("board-service mergeBoardTickets", () => {
  it("preserves omitted session tickets during manual board writes", () => {
    const current = [ticket("manual-old"), ticket("session-s1", "session")];
    const incoming = [ticket("manual-new")];
    expect(mergeBoardTickets(current, incoming).map((t) => t.id)).toEqual(["manual-new", "session-s1"]);
  });

  it("allows explicit deletion of a session ticket", () => {
    const current = [ticket("session-s1", "session")];
    expect(mergeBoardTickets(current, [], new Set(["session-s1"]))).toEqual([]);
  });

  it("accepts array payloads and object payloads with deletedIds", () => {
    expect(parseBoardWritePayload([ticket("a")]).tickets).toHaveLength(1);
    const parsed = parseBoardWritePayload({ tickets: [ticket("a")], deletedIds: ["session-s1"] });
    expect(parsed.deletedIds.has("session-s1")).toBe(true);
  });

  it("defaults missing complexity to medium", () => {
    expect(boardTicketComplexity(ticket("a"))).toBe("medium");
    expect(boardTicketComplexity({ ...ticket("b"), complexity: "low" })).toBe("low");
  });
});
