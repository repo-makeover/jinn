import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ServerResponse } from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const scheduleOnLoadTailSync = vi.fn();
const scheduleTranscriptBackfill = vi.fn();
const loadRawTranscript = vi.fn();

vi.mock("../external-turns.js", () => ({
  scheduleOnLoadTailSync,
}));

vi.mock("../transcript-backfill.js", () => ({
  loadRawTranscript,
  scheduleTranscriptBackfill,
}));

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

async function setup() {
  vi.resetModules();
  const api = await import("../api.js");
  const reg = await import("../../sessions/registry.js");
  reg.initDb();
  return { api, reg };
}

function makeCtx(api: Awaited<ReturnType<typeof setup>>["api"]) {
  return {
    getConfig: () => ({ gateway: {}, engines: {}, portal: {} }),
    connectors: new Map(),
    startTime: Date.now(),
    emit: vi.fn(),
    sessionManager: {
      getEngine: () => undefined,
      getQueue: () => ({
        getPendingCount: () => 0,
        getTransportState: (_key: string, status: string) => status,
      }),
    },
  } as unknown as import("../api.js").ApiContext;
}

beforeEach(() => {
  prevHome = process.env.JINN_HOME;
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "jinn-session-query-"));
  process.env.JINN_HOME = tmpHome;
  scheduleOnLoadTailSync.mockReset();
  scheduleTranscriptBackfill.mockReset();
  loadRawTranscript.mockReset();
  vi.resetModules();
});

afterEach(() => {
  if (prevHome === undefined) delete process.env.JINN_HOME;
  else process.env.JINN_HOME = prevHome;
  fs.rmSync(tmpHome, { recursive: true, force: true });
  vi.clearAllMocks();
});

let prevHome: string | undefined;
let tmpHome: string;

describe("session query routes", () => {
  it("returns the default grouped session payload shape for GET /api/sessions", async () => {
    const { api, reg } = await setup();
    const ctx = makeCtx(api);

    const direct = reg.createSession({ engine: "claude", source: "web", sourceRef: "web:default", prompt: "default" });
    reg.updateSession(direct.id, { title: "Default Session" });
    reg.createSession({
      engine: "claude",
      source: "web",
      sourceRef: "web:worker-default",
      employee: "worker",
      prompt: "worker default",
    });

    const cap = makeRes();
    await api.handleApiRequest(makeReq("GET", "/api/sessions"), cap.res, ctx);

    expect(cap.status).toBe(200);
    expect(cap.body).toEqual(
      expect.objectContaining({
        sessions: expect.arrayContaining([
          expect.objectContaining({ id: direct.id, title: "Default Session" }),
        ]),
        counts: expect.any(Object),
        perGroup: 50,
      }),
    );
  });

  it("preserves q/group/offset/limit list behavior for GET /api/sessions", async () => {
    const { api, reg } = await setup();
    const ctx = makeCtx(api);

    const direct = reg.createSession({ engine: "claude", source: "web", sourceRef: "web:direct", prompt: "alpha prompt" });
    reg.updateSession(direct.id, { title: "Alpha Unique Session" });
    const workerOld = reg.createSession({
      engine: "claude",
      source: "web",
      sourceRef: "web:worker-old",
      employee: "worker",
      prompt: "worker older",
    });
    const workerNew = reg.createSession({
      engine: "claude",
      source: "web",
      sourceRef: "web:worker-new",
      employee: "worker",
      prompt: "worker newer",
    });
    reg.updateSession(workerOld.id, { lastActivity: "2026-06-22T10:00:00.000Z" });
    reg.updateSession(workerNew.id, { lastActivity: "2026-06-22T10:00:01.000Z" });

    const search = makeRes();
    await api.handleApiRequest(makeReq("GET", "/api/sessions?q=Alpha%20Unique%20Session"), search.res, ctx);
    expect(search.status).toBe(200);
    expect(search.body).toEqual([
      expect.objectContaining({ id: direct.id, title: "Alpha Unique Session" }),
    ]);

    const group = makeRes();
    await api.handleApiRequest(makeReq("GET", "/api/sessions?group=worker&limit=1&offset=1"), group.res, ctx);
    expect(group.status).toBe(200);
    expect(group.body).toEqual([
      expect.objectContaining({ id: workerOld.id }),
    ]);
    expect((group.body as Array<{ id: string }>).map((session) => session.id)).not.toContain(workerNew.id);

    const all = makeRes();
    await api.handleApiRequest(makeReq("GET", "/api/sessions?limit=0"), all.res, ctx);
    expect(all.status).toBe(200);
    expect(Array.isArray(all.body)).toBe(true);
    expect((all.body as Array<{ id: string }>).map((session) => session.id)).toEqual(
      expect.arrayContaining([direct.id, workerOld.id, workerNew.id]),
    );
  });

  it("keeps /api/sessions/interrupted ahead of generic session detail matching", async () => {
    const { api, reg } = await setup();
    const ctx = makeCtx(api);
    const session = reg.createSession({ engine: "claude", source: "web", sourceRef: "web:interrupted", prompt: "resume me" });
    reg.updateSession(session.id, { status: "interrupted", engineSessionId: "claude-resume-id" });

    const cap = makeRes();
    await api.handleApiRequest(makeReq("GET", "/api/sessions/interrupted"), cap.res, ctx);

    expect(cap.status).toBe(200);
    expect(Array.isArray(cap.body)).toBe(true);
    expect(cap.body).toEqual([
      expect.objectContaining({ id: session.id, status: "interrupted" }),
    ]);
  });

  it("preserves ?last=N and Claude on-load tail sync for session detail", async () => {
    const { api, reg } = await setup();
    const ctx = makeCtx(api);
    const session = reg.createSession({ engine: "claude", source: "web", sourceRef: "web:last-n", prompt: "last n" });
    reg.updateSession(session.id, { engineSessionId: "claude-tail-id" });
    reg.insertMessage(session.id, "user", "one");
    reg.insertMessage(session.id, "assistant", "two");
    reg.insertMessage(session.id, "assistant", "three");

    const cap = makeRes();
    await api.handleApiRequest(makeReq("GET", `/api/sessions/${session.id}?last=2`), cap.res, ctx);

    expect(cap.status).toBe(200);
    expect((cap.body as { messages: Array<{ content: string }> }).messages.map((message) => message.content)).toEqual([
      "two",
      "three",
    ]);
    expect(scheduleOnLoadTailSync).toHaveBeenCalledWith(session.id, ctx.emit);
    expect(scheduleTranscriptBackfill).not.toHaveBeenCalled();
  });

  it("schedules transcript backfill when a session has no stored messages yet", async () => {
    const { api, reg } = await setup();
    const ctx = makeCtx(api);
    const session = reg.createSession({ engine: "claude", source: "web", sourceRef: "web:backfill", prompt: "backfill" });
    reg.updateSession(session.id, { engineSessionId: "claude-backfill-id" });

    const cap = makeRes();
    await api.handleApiRequest(makeReq("GET", `/api/sessions/${session.id}`), cap.res, ctx);

    expect(cap.status).toBe(200);
    expect(scheduleTranscriptBackfill).toHaveBeenCalledWith(session.id, "claude-backfill-id", ctx);
    expect(scheduleOnLoadTailSync).not.toHaveBeenCalled();
  });

  it("returns 404 for missing session detail and transcript routes", async () => {
    const { api } = await setup();
    const ctx = makeCtx(api);

    const detail = makeRes();
    await api.handleApiRequest(makeReq("GET", "/api/sessions/missing-session"), detail.res, ctx);
    expect(detail.status).toBe(404);

    const transcript = makeRes();
    await api.handleApiRequest(makeReq("GET", "/api/sessions/missing-session/transcript"), transcript.res, ctx);
    expect(transcript.status).toBe(404);

    const queue = makeRes();
    await api.handleApiRequest(makeReq("GET", "/api/sessions/missing-session/queue"), queue.res, ctx);
    expect(queue.status).toBe(404);
  });

  it("returns an empty transcript when the session has no engine session id", async () => {
    const { api, reg } = await setup();
    const ctx = makeCtx(api);
    const session = reg.createSession({ engine: "claude", source: "web", sourceRef: "web:no-engine", prompt: "no engine" });

    const transcript = makeRes();
    await api.handleApiRequest(makeReq("GET", `/api/sessions/${session.id}/transcript`), transcript.res, ctx);

    expect(transcript.status).toBe(200);
    expect(transcript.body).toEqual([]);
    expect(loadRawTranscript).not.toHaveBeenCalled();
  });

  it("preserves children and transcript route ownership", async () => {
    const { api, reg } = await setup();
    const ctx = makeCtx(api);
    const parent = reg.createSession({ engine: "claude", source: "web", sourceRef: "web:parent", prompt: "parent" });
    const child = reg.createSession({
      engine: "claude",
      source: "web",
      sourceRef: "web:child",
      parentSessionId: parent.id,
      prompt: "child",
    });
    const transcriptSession = reg.createSession({ engine: "claude", source: "web", sourceRef: "web:tx", prompt: "transcript" });
    reg.updateSession(transcriptSession.id, { engineSessionId: "claude-transcript-id" });
    loadRawTranscript.mockReturnValue([{ type: "assistant", text: "raw entry" }]);

    const children = makeRes();
    await api.handleApiRequest(makeReq("GET", `/api/sessions/${parent.id}/children`), children.res, ctx);
    expect(children.status).toBe(200);
    expect(children.body).toEqual([
      expect.objectContaining({ id: child.id }),
    ]);

    const transcript = makeRes();
    await api.handleApiRequest(makeReq("GET", `/api/sessions/${transcriptSession.id}/transcript`), transcript.res, ctx);
    expect(transcript.status).toBe(200);
    expect(transcript.body).toEqual([{ type: "assistant", text: "raw entry" }]);
    expect(loadRawTranscript).toHaveBeenCalledWith("claude-transcript-id");
  });

  it("preserves queue route ownership for read-only session queue lookup", async () => {
    const { api, reg } = await setup();
    const ctx = makeCtx(api);
    const session = reg.createSession({ engine: "claude", source: "web", sourceRef: "web:queue", prompt: "queue" });

    const queue = makeRes();
    await api.handleApiRequest(makeReq("GET", `/api/sessions/${session.id}/queue`), queue.res, ctx);

    expect(queue.status).toBe(200);
    expect(queue.body).toEqual([]);
  });
});
