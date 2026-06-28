import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { withStaticTempJinnHome } from "../../test-utils/jinn-home.js";

withStaticTempJinnHome("jinn-getorcreate-");

type Reg = typeof import("../registry.js");
let reg: Reg;

beforeAll(async () => {
  reg = await import("../registry.js");
});

beforeEach(() => {
  reg.initDb();
});

describe("getOrCreateSessionByKey (R8 split-brain prevention)", () => {
  it("creates the session once and returns the same row thereafter", () => {
    const opts = { engine: "claude", source: "slack", sourceRef: "thread-1", connector: "slack", sessionKey: "thread-1" };
    const first = reg.getOrCreateSessionByKey("thread-1", opts);
    expect(first.created).toBe(true);

    const second = reg.getOrCreateSessionByKey("thread-1", opts);
    expect(second.created).toBe(false);
    expect(second.session.id).toBe(first.session.id);

    // Exactly one row exists for the key.
    const all = reg.listSessions().filter((s) => s.sessionKey === "thread-1");
    expect(all).toHaveLength(1);
  });
});
