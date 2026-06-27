import type { JinnConfig, KnowledgeReadProvider } from "../../shared/types.js";
import { NoopKnowledgeReadProvider } from "./noop.js";
import { WebhookKnowledgeReadProvider } from "./webhook.js";

export function buildKnowledgeReadProvider(config: JinnConfig): KnowledgeReadProvider {
  const provider = config.knowledge?.readProvider;
  if (provider?.type === "webhook" && provider.webhook?.url) {
    return new WebhookKnowledgeReadProvider({
      url: provider.webhook.url,
      token: provider.webhook.token,
      timeoutMs: provider.webhook.timeoutMs ?? 10_000,
    });
  }
  return new NoopKnowledgeReadProvider();
}
