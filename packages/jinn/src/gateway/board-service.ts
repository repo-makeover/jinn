import fs from "node:fs";
import path from "node:path";
import { safeWriteFile } from "../shared/safe-write.js";

export type BoardTicketStatus = "backlog" | "todo" | "in_progress" | "review" | "done" | "blocked";
export type BoardTicketPriority = "low" | "medium" | "high";
export type BoardTicketComplexity = "low" | "medium" | "high";
export const DEFAULT_RECYCLE_BIN_RETENTION_DAYS = 3;
export const MIN_RECYCLE_BIN_RETENTION_DAYS = 0;
export const MAX_RECYCLE_BIN_RETENTION_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;
const VALID_COMPLEXITIES = new Set<BoardTicketComplexity>(["low", "medium", "high"]);

export interface BoardTicket {
  id: string;
  title: string;
  description: string;
  status: BoardTicketStatus;
  priority: BoardTicketPriority;
  complexity?: BoardTicketComplexity;
  assignee: string;
  source?: string;
  sessionId?: string;
  createdAt: string;
  updatedAt: string;
  [k: string]: unknown;
}

export interface DeletedBoardTicket extends BoardTicket {
  deletedAt: string;
}

export interface BoardState {
  tickets: BoardTicket[];
  deletedTickets: DeletedBoardTicket[];
  retentionDays: number;
}

export function boardTicketComplexity(ticket: Pick<BoardTicket, "complexity">): BoardTicketComplexity {
  return typeof ticket.complexity === "string" && VALID_COMPLEXITIES.has(ticket.complexity as BoardTicketComplexity)
    ? ticket.complexity as BoardTicketComplexity
    : "medium";
}

export function clampRecycleBinRetentionDays(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_RECYCLE_BIN_RETENTION_DAYS;
  return Math.max(MIN_RECYCLE_BIN_RETENTION_DAYS, Math.min(MAX_RECYCLE_BIN_RETENTION_DAYS, Math.round(n)));
}

export function boardPath(orgDir: string, department: string): string {
  return path.join(orgDir, department, "board.json");
}

export function defaultBoardState(retentionDays = DEFAULT_RECYCLE_BIN_RETENTION_DAYS): BoardState {
  return {
    tickets: [],
    deletedTickets: [],
    retentionDays: clampRecycleBinRetentionDays(retentionDays),
  };
}

function parseBoardState(payload: unknown): BoardState | null {
  if (Array.isArray(payload)) {
    return { ...defaultBoardState(), tickets: payload as BoardTicket[] };
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const parsed = payload as { tickets?: unknown; deletedTickets?: unknown; retentionDays?: unknown };
  if (!Array.isArray(parsed.tickets)) return null;
  return {
    tickets: parsed.tickets as BoardTicket[],
    deletedTickets: Array.isArray(parsed.deletedTickets) ? parsed.deletedTickets as DeletedBoardTicket[] : [],
    retentionDays: clampRecycleBinRetentionDays(parsed.retentionDays),
  };
}

function pruneDeletedTickets(
  deletedTickets: DeletedBoardTicket[],
  retentionDays: number,
  now = Date.now(),
): DeletedBoardTicket[] {
  if (retentionDays <= 0) return [];
  const cutoff = now - (retentionDays * DAY_MS);
  return deletedTickets.filter((ticket) => {
    const deletedAt = Date.parse(ticket.deletedAt);
    return Number.isFinite(deletedAt) && deletedAt >= cutoff;
  });
}

function serializeBoardState(state: BoardState): string {
  const normalized: BoardState = {
    tickets: state.tickets,
    deletedTickets: state.deletedTickets,
    retentionDays: clampRecycleBinRetentionDays(state.retentionDays),
  };
  const payload: BoardState | BoardTicket[] =
    normalized.deletedTickets.length === 0 && normalized.retentionDays === DEFAULT_RECYCLE_BIN_RETENTION_DAYS
      ? normalized.tickets
      : normalized;
  return JSON.stringify(payload, null, 2);
}

export function readBoardState(orgDir: string, department: string): BoardState | null {
  const file = boardPath(orgDir, department);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf-8");
  const parsed = parseBoardState(JSON.parse(raw));
  if (!parsed) throw new Error("board.json must be an array or { tickets, deletedTickets, retentionDays }");
  const normalized: BoardState = {
    tickets: parsed.tickets,
    deletedTickets: pruneDeletedTickets(parsed.deletedTickets, parsed.retentionDays),
    retentionDays: clampRecycleBinRetentionDays(parsed.retentionDays),
  };
  const serialized = serializeBoardState(normalized);
  if (serialized !== raw) safeWriteFile(file, serialized);
  return normalized;
}

export function readBoardArray(orgDir: string, department: string): BoardTicket[] | null {
  return readBoardState(orgDir, department)?.tickets ?? null;
}

export function parseBoardWritePayload(
  payload: unknown,
): { tickets: BoardTicket[]; deletedIds: Set<string>; retentionDays: number | null } {
  if (Array.isArray(payload)) return { tickets: payload as BoardTicket[], deletedIds: new Set(), retentionDays: null };
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const p = payload as { tickets?: unknown; deletedIds?: unknown; retentionDays?: unknown };
    if (!Array.isArray(p.tickets)) throw new Error("tickets must be an array");
    const deletedIds = new Set<string>();
    if (Array.isArray(p.deletedIds)) {
      for (const id of p.deletedIds) {
        if (typeof id === "string" && id.trim()) deletedIds.add(id);
      }
    }
    return {
      tickets: p.tickets as BoardTicket[],
      deletedIds,
      retentionDays: p.retentionDays == null ? null : clampRecycleBinRetentionDays(p.retentionDays),
    };
  }
  throw new Error("Board payload must be an array or { tickets, deletedIds, retentionDays }");
}

export function mergeBoardTickets(current: BoardTicket[], incoming: BoardTicket[], deletedIds = new Set<string>()): BoardTicket[] {
  const filteredIncoming = incoming.filter((ticket) => ticket && ticket.id && !deletedIds.has(ticket.id));
  const incomingIds = new Set(filteredIncoming.map((ticket) => ticket.id).filter(Boolean));
  const merged = [...filteredIncoming];
  for (const ticket of current) {
    if (ticket?.source !== "session") continue;
    if (incomingIds.has(ticket.id) || deletedIds.has(ticket.id)) continue;
    merged.push(ticket);
  }
  return merged;
}

function mergeDeletedTickets(
  current: BoardState,
  activeTickets: BoardTicket[],
  deletedIds: Set<string>,
  deletedAt: string,
): DeletedBoardTicket[] {
  const activeIds = new Set(activeTickets.map((ticket) => ticket.id).filter(Boolean));
  const deleted = new Map(current.deletedTickets.map((ticket) => [ticket.id, ticket]));
  for (const deletedId of deletedIds) {
    if (deleted.has(deletedId)) continue;
    const existing = current.tickets.find((ticket) => ticket.id === deletedId);
    if (!existing) continue;
    deleted.set(deletedId, { ...existing, deletedAt });
  }
  return [...deleted.values()].filter((ticket) => !activeIds.has(ticket.id));
}

export function writeMergedBoard(
  orgDir: string,
  department: string,
  payload: unknown,
): BoardTicket[] {
  const file = boardPath(orgDir, department);
  const current = readBoardState(orgDir, department) ?? defaultBoardState();
  const { tickets, deletedIds, retentionDays } = parseBoardWritePayload(payload);
  const nextRetentionDays = retentionDays ?? current.retentionDays;
  const mergedTickets = mergeBoardTickets(current.tickets, tickets, deletedIds);
  const mergedDeletedTickets = pruneDeletedTickets(
    mergeDeletedTickets(current, mergedTickets, deletedIds, new Date().toISOString()),
    nextRetentionDays,
  );
  safeWriteFile(file, serializeBoardState({
    tickets: mergedTickets,
    deletedTickets: mergedDeletedTickets,
    retentionDays: nextRetentionDays,
  }));
  verifyBoardWrite(file, mergedTickets);
  return mergedTickets;
}

export function writeBoardTickets(orgDir: string, department: string, tickets: BoardTicket[]): void {
  const current = readBoardState(orgDir, department) ?? defaultBoardState();
  const file = boardPath(orgDir, department);
  safeWriteFile(file, serializeBoardState({
    tickets,
    deletedTickets: pruneDeletedTickets(current.deletedTickets, current.retentionDays),
    retentionDays: current.retentionDays,
  }));
  verifyBoardWrite(file, tickets);
}

/**
 * Read the board back immediately after a write and throw if any expected
 * ticket id is missing. Catches silent truncation, wrong-path writes, and
 * any post-write filesystem anomaly before the caller returns success.
 */
function verifyBoardWrite(file: string, expected: BoardTicket[]): void {
  let onDisk: BoardTicket[];
  try {
    const raw = fs.readFileSync(file, "utf-8");
    const parsed = parseBoardState(JSON.parse(raw));
    onDisk = parsed?.tickets ?? [];
  } catch (err) {
    throw new Error(
      `board write-verify: could not re-read ${file} after write — ${err instanceof Error ? err.message : String(err)}`
    );
  }
  const onDiskIds = new Set(onDisk.map((t) => t.id));
  const missing = expected.map((t) => t.id).filter((id) => id && !onDiskIds.has(id));
  if (missing.length > 0) {
    throw new Error(
      `board write-verify: ${missing.length} ticket(s) missing from ${file} after write: ${missing.join(", ")}`
    );
  }
}

/** Counts tickets in a board by status — used for startup/reload summaries. */
function countByStatus(tickets: BoardTicket[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of tickets) {
    const s = t.status ?? "unknown";
    counts[s] = (counts[s] ?? 0) + 1;
  }
  return counts;
}

/**
 * Log a one-line summary per department board to `log`.
 * Call on startup and after config reload so board state is always visible in
 * the daemon log — makes "tickets added but not showing" detectable immediately.
 */
export function logBoardSummary(orgDir: string, log: (msg: string) => void): void {
  if (!fs.existsSync(orgDir)) return;
  let totalDepts = 0;
  let totalTickets = 0;
  for (const dept of fs.readdirSync(orgDir)) {
    const file = boardPath(orgDir, dept);
    if (!fs.existsSync(file)) continue;
    try {
      const state = readBoardState(orgDir, dept);
      if (!state) continue;
      const counts = countByStatus(state.tickets);
      const summary = Object.entries(counts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([s, n]) => `${n} ${s}`)
        .join(", ");
      log(`[board] ${dept}: ${state.tickets.length} ticket(s) — ${summary || "empty"}`);
      totalDepts++;
      totalTickets += state.tickets.length;
    } catch (err) {
      log(`[board] ${dept}: ERROR reading board.json — ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (totalDepts > 0) {
    log(`[board] summary: ${totalDepts} dept(s), ${totalTickets} total ticket(s)`);
  }
}
