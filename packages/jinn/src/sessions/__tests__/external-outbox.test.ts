import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { withStaticTempJinnHome } from "../../test-utils/jinn-home.js";

const { home: _tmpHome } = withStaticTempJinnHome("jinn-external-outbox-");

type Reg = typeof import("../registry.js");
let reg: Reg;

beforeAll(async () => {
  reg = await import("../registry.js");
});

beforeEach(() => {
  reg.initDb();
});

describe("external outbox registry", () => {
  it("creates, deduplicates, and updates durable outbox rows", () => {
    const first = reg.enqueueExternalOutboxItem({
      sinkName: "noop",
      envelope: {
        envelopeId: "env-1",
        producer: "jinn",
        schemaVersion: "1",
        topic: "jinn.checkpoint.decision.v1",
        occurredAt: "2026-06-26T00:00:00.000Z",
        idempotencyKey: "idem-1",
        partitionKey: "part-1",
        workspace: null,
        actor: null,
        sourceRef: "web:test",
        payload: { kind: "checkpoint" },
      },
    });
    const second = reg.enqueueExternalOutboxItem({
      sinkName: "noop",
      envelope: {
        envelopeId: "env-2",
        producer: "jinn",
        schemaVersion: "1",
        topic: "jinn.checkpoint.decision.v1",
        occurredAt: "2026-06-26T00:00:00.000Z",
        idempotencyKey: "idem-1",
        partitionKey: "part-1",
        workspace: null,
        actor: null,
        sourceRef: "web:test",
        payload: { kind: "checkpoint" },
      },
    });

    expect(second.id).toBe(first.id);
    expect(reg.listPendingExternalOutboxItems(10)).toHaveLength(1);

    const failed = reg.markExternalOutboxFailed(first.id, "network down", "2026-06-26T00:10:00.000Z");
    expect(failed).toEqual(expect.objectContaining({
      attemptCount: 1,
      lastError: "network down",
      nextAttemptAt: "2026-06-26T00:10:00.000Z",
    }));

    const delivered = reg.markExternalOutboxDelivered(first.id, "remote-1");
    expect(delivered).toEqual(expect.objectContaining({
      status: "delivered",
      remoteId: "remote-1",
    }));
  });

  it("claims items once (no double-claim) and caps retries to a terminal failed state (R7)", () => {
    const item = reg.enqueueExternalOutboxItem({
      sinkName: "noop",
      envelope: {
        envelopeId: "env-claim", producer: "jinn", schemaVersion: "1",
        topic: "jinn.checkpoint.decision.v1", occurredAt: "2026-06-26T00:00:00.000Z",
        idempotencyKey: "idem-claim", partitionKey: null, workspace: null, actor: null,
        sourceRef: "web:test", payload: { kind: "checkpoint" },
      },
    });

    // First claim picks it (pending -> sending); a second concurrent claim does not.
    expect(reg.claimPendingExternalOutboxItems(10).map((i) => i.id)).toContain(item.id);
    expect(reg.claimPendingExternalOutboxItems(10).map((i) => i.id)).not.toContain(item.id);

    // Failing past the attempt cap moves it to terminal 'failed' (no more retries).
    const past = "2000-01-01T00:00:00.000Z";
    for (let i = 0; i < 10; i += 1) reg.markExternalOutboxFailed(item.id, "sink down", past);
    expect(reg.getExternalOutboxItem(item.id)?.status).toBe("failed");
    expect(reg.claimPendingExternalOutboxItems(10).map((i) => i.id)).not.toContain(item.id);
  });
});
