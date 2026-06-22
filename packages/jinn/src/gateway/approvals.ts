import fs from "node:fs";
import { v4 as uuidv4 } from "uuid";
import { APPROVALS_FILE } from "../shared/paths.js";
import { safeWriteJson } from "../shared/safe-write.js";
import type { Approval, JsonObject } from "../shared/types.js";

/**
 * Persisted approval store.
 *
 * A generic human-approval queue backing Feature 1. Today the only producer is
 * model-fallback (`type:"fallback"`), but `tool`/`custom` approvals are accepted
 * by the same store + endpoints so future gates need no schema change.
 *
 * Persisted as a single JSON array via `safeWriteJson` (atomic + audited) — low
 * approval volume, matches the other small JSON state files in JINN_HOME. An
 * in-memory cache mirrors the file; the gateway is single-process so this is
 * authoritative for the run.
 */

let cache: Approval[] | null = null;
let storePath = APPROVALS_FILE;

function load(): Approval[] {
  if (cache) return cache;
  try {
    const raw = fs.readFileSync(storePath, "utf-8");
    const parsed = JSON.parse(raw);
    cache = Array.isArray(parsed) ? (parsed as Approval[]) : [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") cache = [];
    else throw err;
  }
  return cache;
}

function persist(): void {
  safeWriteJson(storePath, cache ?? [], {
    audit: { actor: "gateway", op: "approvals.save" },
    validate: (v) => {
      if (!Array.isArray(v)) throw new Error("approvals store must be an array");
    },
  });
}

/** Test seam: point the store at a throwaway file and reset the cache. */
export function __setApprovalsStoreForTest(path: string): void {
  storePath = path;
  cache = null;
}

export function listApprovals(filter?: { state?: Approval["state"] | "all"; sessionId?: string }): Approval[] {
  let items = [...load()];
  const state = filter?.state ?? "pending";
  if (state !== "all") items = items.filter((a) => a.state === state);
  if (filter?.sessionId) items = items.filter((a) => a.sessionId === filter.sessionId);
  // Newest first.
  return items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getApproval(id: string): Approval | undefined {
  return load().find((a) => a.id === id);
}

/**
 * Create an approval. For `fallback` approvals we dedupe per session: a session
 * that re-enters the ask_user branch reuses its existing pending approval rather
 * than stacking duplicates.
 */
export function createApproval(input: {
  sessionId: string;
  type: Approval["type"];
  payload: JsonObject;
}): Approval {
  const items = load();
  if (input.type === "fallback") {
    const existing = items.find(
      (a) => a.sessionId === input.sessionId && a.type === "fallback" && a.state === "pending",
    );
    if (existing) {
      existing.payload = input.payload;
      persist();
      return existing;
    }
  }
  const approval: Approval = {
    id: uuidv4(),
    sessionId: input.sessionId,
    type: input.type,
    payload: input.payload,
    state: "pending",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    actor: null,
  };
  items.push(approval);
  persist();
  return approval;
}

export class ApprovalStateError extends Error {
  constructor(public readonly currentState: Approval["state"]) {
    super(`approval is ${currentState}, not pending`);
    this.name = "ApprovalStateError";
  }
}

/**
 * Resolve an approval. Valid only from `pending` (else throws ApprovalStateError
 * → 409 at the endpoint). Idempotent guard prevents double-approve races.
 */
export function resolveApproval(
  id: string,
  state: "approved" | "rejected",
  actor?: string | null,
): Approval {
  const items = load();
  const approval = items.find((a) => a.id === id);
  if (!approval) throw new Error(`approval ${id} not found`);
  if (approval.state !== "pending") throw new ApprovalStateError(approval.state);
  approval.state = state;
  approval.resolvedAt = new Date().toISOString();
  approval.actor = actor ?? null;
  persist();
  return approval;
}
