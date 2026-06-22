import fs from "node:fs";
import path from "node:path";
import { safeWriteFile } from "../shared/safe-write.js";

export interface BoardTicket {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done" | "blocked";
  priority: string;
  assignee: string;
  source?: string;
  sessionId?: string;
  createdAt: string;
  updatedAt: string;
  [k: string]: unknown;
}

export function boardPath(orgDir: string, department: string): string {
  return path.join(orgDir, department, "board.json");
}

export function readBoardArray(orgDir: string, department: string): BoardTicket[] | null {
  const file = boardPath(orgDir, department);
  if (!fs.existsSync(file)) return null;
  const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
  return Array.isArray(parsed) ? parsed as BoardTicket[] : null;
}

export function parseBoardWritePayload(payload: unknown): { tickets: BoardTicket[]; deletedIds: Set<string> } {
  if (Array.isArray(payload)) return { tickets: payload as BoardTicket[], deletedIds: new Set() };
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const p = payload as { tickets?: unknown; deletedIds?: unknown };
    if (!Array.isArray(p.tickets)) throw new Error("tickets must be an array");
    const deletedIds = new Set<string>();
    if (Array.isArray(p.deletedIds)) {
      for (const id of p.deletedIds) {
        if (typeof id === "string" && id.trim()) deletedIds.add(id);
      }
    }
    return { tickets: p.tickets as BoardTicket[], deletedIds };
  }
  throw new Error("Board payload must be an array or { tickets, deletedIds }");
}

export function mergeBoardTickets(current: BoardTicket[], incoming: BoardTicket[], deletedIds = new Set<string>()): BoardTicket[] {
  const incomingIds = new Set(incoming.map((ticket) => ticket.id).filter(Boolean));
  const merged = [...incoming];
  for (const ticket of current) {
    if (ticket?.source !== "session") continue;
    if (incomingIds.has(ticket.id) || deletedIds.has(ticket.id)) continue;
    merged.push(ticket);
  }
  return merged;
}

export function writeMergedBoard(
  orgDir: string,
  department: string,
  payload: unknown,
): BoardTicket[] {
  const file = boardPath(orgDir, department);
  const current = readBoardArray(orgDir, department) ?? [];
  const { tickets, deletedIds } = parseBoardWritePayload(payload);
  const merged = mergeBoardTickets(current, tickets, deletedIds);
  safeWriteFile(file, JSON.stringify(merged, null, 2));
  return merged;
}

export function writeBoardTickets(orgDir: string, department: string, tickets: BoardTicket[]): void {
  safeWriteFile(boardPath(orgDir, department), JSON.stringify(tickets, null, 2));
}
