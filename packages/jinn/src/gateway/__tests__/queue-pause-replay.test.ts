import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

vi.mock("../run-web-session.js", () => ({
  runWebSession: vi.fn(async () => {}),
}));

async function setup() {
  vi.resetModules();
  const dispatch = await import("../api/session-dispatch.js");
  const reg = await import("../../sessions/registry.js");
  const { SessionQueue } = await import("../../sessions/queue.js");
  reg.initDb();
  return { dispatch, reg, SessionQueue };
}

let prevHome: string | undefined;
let tmpHome: string;

beforeEach(() => {
  prevHome = process.env.JINN_HOME;
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "jinn-queue-pause-replay-"));
  process.env.JINN_HOME = tmpHome;
  vi.resetModules();
});

afterEach(() => {
  if (prevHome === undefined) delete process.env.JINN_HOME;
  else process.env.JINN_HOME = prevHome;
  fs.rmSync(tmpHome, { recursive: true, force: true });
  vi.clearAllMocks();
});

describe("resumePendingWebQueueItems", () => {
  it("leaves paused pending work untouched across a restarted queue until resume", async () => {
    const { dispatch, reg, SessionQueue } = await setup();
    const session = reg.createSession({
      engine: "claude",
      source: "web",
      sourceRef: "web:paused-replay",
      prompt: "queued work",
    });

    const originalQueue = new SessionQueue();
    originalQueue.pauseQueue(session.sessionKey);
    const itemId = reg.enqueueQueueItem(session.id, session.sessionKey, "continue after restart");

    // Simulate restart: a new in-memory queue must hydrate the durable pause row.
    const restartedQueue = new SessionQueue();
    const getEngine = vi.fn(() => ({}) as any);
    const ctx = {
      getConfig: () => ({ gateway: {}, engines: { default: "claude" } }),
      connectors: new Map(),
      startTime: Date.now(),
      emit: vi.fn(),
      sessionManager: {
        getEngine,
        getQueue: () => restartedQueue,
      },
    } as any;

    dispatch.resumePendingWebQueueItems(ctx);
    await new Promise((resolve) => setTimeout(resolve, 25));

    expect(restartedQueue.isPaused(session.sessionKey)).toBe(true);
    expect(reg.getQueueItem(itemId)?.status).toBe("pending");
    expect(getEngine).not.toHaveBeenCalled();

    restartedQueue.resumeQueue(session.sessionKey);
    dispatch.resumePendingWebQueueItems(ctx);
    await new Promise((resolve) => setTimeout(resolve, 25));

    expect(getEngine).toHaveBeenCalledWith("claude");
    expect(reg.getQueueItem(itemId)?.status).toBe("completed");
  });
});
