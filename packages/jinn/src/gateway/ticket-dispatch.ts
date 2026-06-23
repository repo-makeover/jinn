import { createSession, getSession, getSessionBySessionKey, updateSession } from "../sessions/registry.js";
import type { Employee, JsonObject, Session } from "../shared/types.js";
import { logger } from "../shared/logger.js";
import { dispatchWebSessionRun } from "./api/session-dispatch.js";
import { findEmployee, scanOrg } from "./org.js";
import { readBoardArray, writeBoardTickets, type BoardTicket } from "./board-service.js";
import type { ApiContext } from "./api/context.js";

export type DispatchTicketFailureReason =
  | "no-assignee"
  | "not-found"
  | "unknown-employee"
  | "foreign-department-assignee"
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

type BoardDispatchState = "session_created" | "board_linked";

function boardDispatchMeta(session: Session): Record<string, unknown> {
  const meta = session.transportMeta;
  return meta && typeof meta === "object" && !Array.isArray(meta) ? meta : {};
}

function withBoardDispatchState(
  session: Session,
  state: BoardDispatchState,
): JsonObject {
  return {
    ...boardDispatchMeta(session),
    boardDispatchState: state,
  };
}

function isRecoverableBoardDispatchSession(session: Session): boolean {
  const state = boardDispatchMeta(session).boardDispatchState;
  return state === "session_created" || state === "board_linked";
}

function matchesBoardDispatchSession(
  session: Session,
  sessionKey: string,
  source: DispatchTicketOptions["source"],
  department: string,
  ticketId: string,
): boolean {
  const meta = boardDispatchMeta(session);
  return (
    session.sessionKey === sessionKey &&
    meta.dispatchSource === source &&
    meta.boardDepartment === department &&
    meta.boardTicketId === ticketId
  );
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
  if (employee.department !== department) return { reason: "foreign-department-assignee" };
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

  const sessionKey = `${opts.source}:${department}:${ticketId}`;
  let reusableSession: Session | undefined;
  if (ticket.sessionId) {
    const existing = getSession(ticket.sessionId);
    if (existing?.status === "running") return { ok: false, reason: "already-running" };
    if (
      existing &&
      ticket.status === "in_progress" &&
      isRecoverableBoardDispatchSession(existing) &&
      matchesBoardDispatchSession(existing, sessionKey, opts.source, department, ticketId)
    ) {
      reusableSession = existing;
    }
  } else {
    const existing = getSessionBySessionKey(sessionKey);
    if (
      existing &&
      isRecoverableBoardDispatchSession(existing) &&
      matchesBoardDispatchSession(existing, sessionKey, opts.source, department, ticketId)
    ) {
      reusableSession = existing;
    }
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
  const session = reusableSession ?? createSession({
    engine: employee.engine,
    source: opts.source,
    sourceRef: `${opts.source}:${department}:${ticketId}:${now}`,
    connector: opts.source,
    sessionKey,
    replyContext: { source: opts.source, department, ticketId },
    transportMeta: {
      boardDepartment: department,
      boardTicketId: ticketId,
      boardDispatchState: "session_created",
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

  ticket.status = "in_progress";
  ticket.sessionId = session.id;
  ticket.assignee = employee.name;
  ticket.updatedAt = iso;
  writeBoardTickets(deps.orgDir, department, tickets);

  const runningSession = updateSession(session.id, {
    status: "running",
    lastActivity: iso,
    lastError: null,
    transportMeta: withBoardDispatchState(session, "board_linked"),
  }) ?? {
    ...session,
    status: "running" as const,
    lastActivity: iso,
    lastError: null,
    transportMeta: withBoardDispatchState(session, "board_linked"),
  };

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
    runningSession,
    prompt,
    engine,
    deps.context.getConfig(),
    deps.context,
  );

  return { ok: true, sessionId: session.id };
}
