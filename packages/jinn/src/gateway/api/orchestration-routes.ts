import fs from "node:fs";
import type { ServerResponse } from "node:http";
import { loadDefaultOrchestrationConfig, loadOrchestrationConfig } from "../../orchestration/config.js";
import { PersistentMatrixScheduler } from "../../orchestration/persistent-scheduler.js";
import { ORCH_DB } from "../../shared/paths.js";
import type { ApiContext } from "./context.js";
import { json } from "./responses.js";

const ROUTES = new Set([
  "/api/orchestration/workers",
  "/api/orchestration/leases",
  "/api/orchestration/queue",
  "/api/orchestration/allocations",
]);

export async function handleOrchestrationRoutes(
  method: string,
  pathname: string,
  res: ServerResponse,
  context: ApiContext,
): Promise<boolean> {
  if (!ROUTES.has(pathname)) return false;
  if (method !== "GET") {
    json(res, { error: "Method not allowed" }, 405);
    return true;
  }

  try {
    const config = context.orchestration?.config
      ?? (context.orchestration?.configDir
        ? loadOrchestrationConfig(context.orchestration.configDir)
        : loadDefaultOrchestrationConfig());

    if (pathname === "/api/orchestration/workers") {
      json(res, { workers: config.workers });
      return true;
    }

    const dbPath = context.orchestration?.dbPath ?? ORCH_DB;
    if (dbPath !== ":memory:" && !fs.existsSync(dbPath)) {
      if (pathname === "/api/orchestration/leases") json(res, { leases: [] });
      else if (pathname === "/api/orchestration/queue") json(res, { queue: [] });
      else json(res, { allocations: [] });
      return true;
    }

    const scheduler = PersistentMatrixScheduler.open(config, {
      dbPath,
      expireOnHydrate: false,
      now: context.orchestration?.now,
    });
    try {
      if (pathname === "/api/orchestration/leases") json(res, { leases: scheduler.listLeases() });
      else if (pathname === "/api/orchestration/queue") json(res, { queue: scheduler.listQueue() });
      else json(res, { allocations: scheduler.listAllocations() });
    } finally {
      scheduler.close();
    }
    return true;
  } catch (err) {
    json(res, { error: "orchestration observe failed", detail: err instanceof Error ? err.message : String(err) }, 500);
    return true;
  }
}
