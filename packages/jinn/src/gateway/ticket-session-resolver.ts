import type { Session } from "../shared/types.js";
import type { BoardTicket } from "./board-service.js";

const TICKET_CHANNEL_KEYS = ["channel", "thread", "ticketId"] as const;

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function boardMeta(session: Session): Record<string, unknown> | null {
  return asObject(session.transportMeta);
}

function replyMeta(session: Session): Record<string, unknown> | null {
  return asObject(session.replyContext);
}

function sessionChannelCandidates(session: Session): string[] {
  const values = new Set<string>();
  const transport = boardMeta(session);
  const reply = replyMeta(session);
  for (const key of TICKET_CHANNEL_KEYS) {
    const transportValue = transport?.[key];
    if (typeof transportValue === "string" && transportValue.trim()) values.add(transportValue);
    const replyValue = reply?.[key];
    if (typeof replyValue === "string" && replyValue.trim()) values.add(replyValue);
  }
  if (session.sessionKey?.trim()) values.add(session.sessionKey);
  if (session.sourceRef?.trim()) values.add(session.sourceRef);
  return [...values];
}

export function sessionMatchesTicket(ticket: Pick<BoardTicket, "id" | "sessionId">, session: Session): boolean {
  const transport = boardMeta(session);
  if (transport?.boardTicketId === ticket.id) return true;

  const persistedSessionId = typeof ticket.sessionId === "string" ? ticket.sessionId.trim() : "";
  if (persistedSessionId) {
    if (session.id === persistedSessionId) return true;
    if (session.engineSessionId === persistedSessionId) return true;
  }

  return sessionChannelCandidates(session).some((candidate) => candidate.includes(ticket.id));
}

export function resolveBestSessionForTicket<T extends Pick<BoardTicket, "id" | "sessionId">>(
  ticket: T,
  sessions: Session[],
): Session | undefined {
  return sessions
    .filter((session) => sessionMatchesTicket(ticket, session))
    .sort((a, b) => Date.parse(b.lastActivity || "") - Date.parse(a.lastActivity || ""))[0];
}

export function findBoardTicketForSession(
  tickets: BoardTicket[],
  session: Session,
  fallbackTicketId: string,
): BoardTicket | undefined {
  const transport = boardMeta(session);
  const boardTicketId = typeof transport?.boardTicketId === "string" ? transport.boardTicketId : null;
  return tickets.find((ticket) =>
    ticket &&
    (
      (boardTicketId !== null && ticket.id === boardTicketId) ||
      ticket.sessionId === session.id ||
      ticket.id === fallbackTicketId
    ),
  );
}
