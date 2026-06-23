import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  DEFAULT_RECYCLE_BIN_RETENTION_DAYS,
  boardTicketComplexity,
  mergeBoardTickets,
  parseBoardWritePayload,
  readBoardState,
  writeMergedBoard,
  type BoardTicket,
} from "../board-service.js";

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
    expect(parsed.retentionDays).toBeNull();
  });

  it("defaults missing complexity to medium", () => {
    expect(boardTicketComplexity(ticket("a"))).toBe("medium");
    expect(boardTicketComplexity({ ...ticket("b"), complexity: "low" })).toBe("low");
  });

  it("moves deleted tickets into deletedTickets and preserves retention", () => {
    const orgDir = fs.mkdtempSync(path.join(os.tmpdir(), "jinn-board-service-"));
    const deptDir = path.join(orgDir, "software-delivery");
    fs.mkdirSync(deptDir, { recursive: true });
    fs.writeFileSync(path.join(deptDir, "board.json"), JSON.stringify([ticket("keep"), ticket("drop")], null, 2));

    writeMergedBoard(orgDir, "software-delivery", {
      tickets: [ticket("keep")],
      deletedIds: ["drop"],
      retentionDays: 5,
    });

    const board = readBoardState(orgDir, "software-delivery");
    expect(board).toBeTruthy();
    expect(board?.retentionDays).toBe(5);
    expect(board?.tickets.map((entry) => entry.id)).toEqual(["keep"]);
    expect(board?.deletedTickets.map((entry) => entry.id)).toEqual(["drop"]);
    expect(board?.deletedTickets[0]?.deletedAt).toBeTruthy();
  });

  it("restores a ticket when it reappears in active tickets", () => {
    const orgDir = fs.mkdtempSync(path.join(os.tmpdir(), "jinn-board-service-"));
    const deptDir = path.join(orgDir, "software-delivery");
    fs.mkdirSync(deptDir, { recursive: true });

    writeMergedBoard(orgDir, "software-delivery", {
      tickets: [ticket("restored")],
      retentionDays: DEFAULT_RECYCLE_BIN_RETENTION_DAYS,
    });
    writeMergedBoard(orgDir, "software-delivery", {
      tickets: [],
      deletedIds: ["restored"],
      retentionDays: DEFAULT_RECYCLE_BIN_RETENTION_DAYS,
    });
    writeMergedBoard(orgDir, "software-delivery", {
      tickets: [ticket("restored")],
      retentionDays: DEFAULT_RECYCLE_BIN_RETENTION_DAYS,
    });

    const board = readBoardState(orgDir, "software-delivery");
    expect(board?.tickets.map((entry) => entry.id)).toEqual(["restored"]);
    expect(board?.deletedTickets).toEqual([]);
  });
});
