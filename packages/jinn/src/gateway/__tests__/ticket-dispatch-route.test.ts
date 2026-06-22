import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ServerResponse } from "node:http";

function makeRes() {
  let status = 200;
  const chunks: Buffer[] = [];
  const res = {
    writeHead(s: number) {
      status = s;
      return this;
    },
    end(buf?: Buffer | string) {
      if (buf) chunks.push(Buffer.isBuffer(buf) ? buf : Buffer.from(buf));
    },
  } as unknown as ServerResponse;
  return {
    res,
    get status() {
      return status;
    },
    get body() {
      const raw = Buffer.concat(chunks).toString("utf-8");
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    },
  };
}

function makeReq(method: string, urlPath: string) {
  return {
    method,
    url: urlPath,
    headers: { host: "localhost" },
  } as any;
}

let prevHome: string | undefined;
let tmpHome: string;

beforeEach(() => {
  prevHome = process.env.JINN_HOME;
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "jinn-ticket-dispatch-route-"));
  process.env.JINN_HOME = tmpHome;
  vi.resetModules();
});

afterEach(() => {
  if (prevHome === undefined) delete process.env.JINN_HOME;
  else process.env.JINN_HOME = prevHome;
  fs.rmSync(tmpHome, { recursive: true, force: true });
  vi.clearAllMocks();
});

describe("POST /api/org/departments/:name/tickets/:id/dispatch", () => {
  it("returns 400 when the ticket has no assignee", async () => {
    const deptDir = path.join(tmpHome, "org", "software-delivery");
    fs.mkdirSync(deptDir, { recursive: true });
    fs.writeFileSync(path.join(deptDir, "board.json"), JSON.stringify([
      {
        id: "ticket-1",
        title: "Run me",
        description: "But nobody owns me",
        status: "todo",
        priority: "medium",
        complexity: "medium",
        assignee: "",
        createdAt: "2026-06-22T00:00:00.000Z",
        updatedAt: "2026-06-22T00:00:00.000Z",
      },
    ]));

    const api = await import("../api.js");
    const cap = makeRes();
    const ctx = {
      getConfig: () => ({ gateway: {}, engines: { default: "claude", claude: { bin: "claude", model: "opus" } } }),
      connectors: new Map(),
      startTime: Date.now(),
      emit: vi.fn(),
      sessionManager: {
        getEngine: () => undefined,
        getQueue: () => ({ enqueue: vi.fn(), getPendingCount: () => 0, getTransportState: (_key: string, status: string) => status }),
      },
    } as any;

    await api.handleApiRequest(
      makeReq("POST", "/api/org/departments/software-delivery/tickets/ticket-1/dispatch"),
      cap.res,
      ctx,
    );

    expect(cap.status).toBe(400);
    expect(cap.body).toMatchObject({ reason: "no-assignee" });
  });
});
