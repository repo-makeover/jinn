import type { JinnConfig, KnowledgeSink } from "../../shared/types.js";
import { JsonlKnowledgeSink } from "./jsonl.js";
import { NoopKnowledgeSink } from "./noop.js";
import { WebhookKnowledgeSink } from "./webhook.js";

export function buildKnowledgeSink(config: JinnConfig): KnowledgeSink {
  const sink = config.knowledge?.sink;
  if (sink?.type === "jsonl") {
    return new JsonlKnowledgeSink(sink.jsonl?.path ?? "");
  }
  if (sink?.type === "webhook" && sink.webhook?.url) {
    return new WebhookKnowledgeSink({
      url: sink.webhook.url,
      token: sink.webhook.token,
      timeoutMs: sink.webhook.timeoutMs ?? 10_000,
    });
  }
  return new NoopKnowledgeSink();
}
