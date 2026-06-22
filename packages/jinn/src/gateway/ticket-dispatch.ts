import { createSession, getSession, updateSession } from "../sessions/registry.js";
import type { Employee } from "../shared/types.js";
import { logger } from "../shared/logger.js";
import { dispatchWebSessionRun } from "./api/session-dispatch.js";
import { findEmployee, scanOrg } from "./org.js";
import { readBoardArray, writeBoardTickets, type BoardTicket } from "./board-service.js";
import type { ApiContext } from "./api/context.js";

export type DispatchTicketFailureReason =
  | "no-assignee"
  | "not-found"
  | "unknown-employee"
  | "no-manager"
  | "already-running";

export type DispatchTicketResult =
  | { ok: true; sessionId: string }
  | { ok: false; reason: DispatchTicketFailureReason };

export interface DispatchTicketDeps {
  context: ApiContext;
  orgDir: string;
  now?: () => number;
}

export interface DispatchTicketOptions {
  source: string;
  routeToManager: boolean;
}

function ticketPrompt(ticket: BoardTicket): string {
  const title = String(ticket.title || "").trim();
  const description = String(ticket.description || "").trim();
  return description ? `${title}\n\n${description}` : title;
}

export function findDepartmentManager(department: string, registry: Map<string, Employee>): Employee | undefined {
  return [...registry.values()]
    .filter((employee) => employee.department === department && employee.rank === "manager")
    .sort((a, b) => a.name.localeCompare(b.name))[0];
}

export function resolveDispatchEmployee(
  department: string,
  ticket: BoardTicket,
  registry: Map<string, Employee>,
  routeToManager: boolean,
): { employee?: Employee; reason?: Exclude<DispatchTicketFailureReason, "not-found" | "already-running"> } {
  if (routeToManager) {
    const manager = findDepartmentManager(department, registry);
    if (!manager) return { reason: "no-manager" };
    return { employee: manager };
  }
  const assignee = typeof ticket.assignee === "string" ? ticket.assignee.trim() : "";
  if (!assignee) return { reason: "no-assignee" };
  const employee = findEmployee(assignee, registry);
  if (!employee) return { reason: "unknown-employee" };
  return { employee };
}

function getTicket(board: BoardTicket[], ticketId: string): BoardTicket | undefined {
  return board.find((ticket) => ticket && ticket.id === ticketId);
}

export function dispatchTicket(
  department: string,
  ticketId: string,
  opts: DispatchTicketOptions,
  deps: DispatchTicketDeps,
): DispatchTicketResult {
  let tickets: BoardTicket[] | null;
  try {
    tickets = readBoardArray(deps.orgDir, department);
  } catch (err) {
    logger.warn(`[ticket-dispatch] failed to parse ${department}/board.json: ${err instanceof Error ? err.message : String(err)}`);
    return { ok: false, reason: "not-found" };
  }
  if (!tickets) return { ok: false, reason: "not-found" };

  const ticket = getTicket(tickets, ticketId);
  if (!ticket) return { ok: false, reason: "not-found" };

  if (ticket.sessionId) {
    const existing = getSession(ticket.sessionId);
    if (existing?.status === "running") return { ok: false, reason: "already-running" };
  }

  const registry = scanOrg();
  const resolved = resolveDispatchEmployee(department, ticket, registry, opts.routeToManager);
  if (!resolved.employee || resolved.reason) {
    return { ok: false, reason: resolved.reason ?? "unknown-employee" };
  }

  const employee = resolved.employee;
  const engine = deps.context.sessionManager.getEngine(employee.engine);
  if (!engine) {
    throw new Error(`Engine "${employee.engine}" not available for ${employee.name}`);
  }

  const now = deps.now?.() ?? Date.now();
  const iso = new Date(now).toISOString();
  const prompt = ticketPrompt(ticket);
  const session = createSession({
    engine: employee.engine,
    source: opts.source,
    sourceRef: `${opts.source}:${department}:${ticketId}:${now}`,
    connector: opts.source,
    sessionKey: `${opts.source}:${department}:${ticketId}`,
    replyContext: { source: opts.source, department, ticketId },
    transportMeta: {
      boardDepartment: department,
      boardTicketId: ticketId,
      dispatchSource: opts.source,
      routedToManager: opts.routeToManager,
    },
    employee: employee.name,
    model: employee.model,
    title: ticket.title,
    effortLevel: employee.effortLevel ?? undefined,
    prompt,
    promptExcerpt: ticket.title,
  });

  updateSession(session.id, {
    status: "running",
    lastActivity: iso,
    lastError: null,
  });

  ticket.status = "in_progress";
  ticket.sessionId = session.id;
  ticket.assignee = employee.name;
  ticket.updatedAt = iso;
  writeBoardTickets(deps.orgDir, department, tickets);
  deps.context.emit("board:updated", { department });
  deps.context.emit("ticket:dispatched", {
    department,
    ticketId,
    sessionId: session.id,
    employee: employee.name,
    source: opts.source,
    routeToManager: opts.routeToManager,
  });

  dispatchWebSessionRun(
    { ...session, status: "running", lastActivity: iso, lastError: null },
    prompt,
    engine,
    deps.context.getConfig(),
    deps.context,
  );

  return { ok: true, sessionId: session.id };
}
