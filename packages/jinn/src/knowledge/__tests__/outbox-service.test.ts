import { describe, expect, it, vi } from "vitest";
import { withStaticTempJinnHome } from "../../test-utils/jinn-home.js";

const { home: _tmpHome } = withStaticTempJinnHome("jinn-knowledge-service-");

describe("knowledge outbox service", () => {
  it("delivers queued envelopes through the configured sink", async () => {
    const reg = await import("../../sessions/registry.js");
    const svc = await import("../outbox-service.js");
    reg.initDb();

    svc.enqueueKnowledgeEnvelope({
      envelopeId: "env-1",
      producer: "jinn",
      schemaVersion: "1",
      topic: "jinn.session.summary.v1",
      occurredAt: "2026-06-26T00:00:00.000Z",
      idempotencyKey: "idem-1",
      partitionKey: null,
      workspace: null,
      actor: null,
      sourceRef: "web:test",
      payload: { ok: true },
    }, "test");

    const result = await svc.relayPendingKnowledgeOutbox({
      sink: {
        name: "test",
        emit: vi.fn(async () => ({
          accepted: 1,
          rejected: 0,
          retryable: false,
          results: [{ accepted: true, remoteId: "remote-1" }],
        })),
        health: vi.fn(async () => ({ ok: true })),
      },
      batchSize: 25,
      retryBaseDelayMs: 1000,
      retryMaxDelayMs: 60000,
    });

    expect(result).toEqual({ attempted: 1, delivered: 1, failed: 0 });
    expect(reg.listExternalOutboxItems({ limit: 10 })[0]).toEqual(expect.objectContaining({
      status: "delivered",
      remoteId: "remote-1",
    }));
  });
});
