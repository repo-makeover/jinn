import { logger } from "../shared/logger.js";
import type { Session, Connector } from "../shared/types.js";

/**
 * Connector identity + reply relay helpers.
 *
 * Extracted from `api.ts` (audit AS-001) without behavior change.
 */

/**
 * Sources that are NOT backed by an external chat connector. Anything else
 * (slack, telegram, discord, whatsapp, …) is connector-sourced and its turn
 * results must be relayed back to the originating channel.
 */
const NON_CONNECTOR_SOURCES = new Set(["web", "talk", "cron"]);

/**
 * Resolve the forwarded SSO identity from request headers, given the configured
 * `gateway.userHeader` (a single header name or a priority-ordered list). Node
 * lowercases incoming header keys, so we look up case-insensitively. Returns the
 * first present, non-empty, trimmed value; `undefined` when the config is unset
 * or no configured header is present. Unset config = single-user no-op: the
 * header is never read and the caller falls back to "web-user".
 */
export function resolveUserHeader(
  headers: Record<string, string | string[] | undefined>,
  userHeaderConfig: string | string[] | undefined,
): string | undefined {
  if (!userHeaderConfig) return undefined;
  const names = Array.isArray(userHeaderConfig) ? userHeaderConfig : [userHeaderConfig];
  for (const name of names) {
    if (!name) continue;
    const raw = headers[name.toLowerCase()];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return undefined;
}

/**
 * Relay a completed turn's assistant text back to the connector channel that
 * originated the session. Inbound connector messages reply via `manager.route`,
 * but turns completed through `runWebSession` (parent callbacks, cron
 * follow-ups, rate-limit resumes) otherwise never reach the channel. No-ops for
 * web/talk/cron sources, empty text, or a missing connector/replyContext; errors
 * are logged and swallowed so delivery failure never breaks completion.
 */
export async function deliverConnectorReply(
  session: Pick<Session, "source" | "connector" | "replyContext"> & { id?: string },
  text: string,
  connectors: Map<string, Connector>,
): Promise<void> {
  if (!text || NON_CONNECTOR_SOURCES.has(session.source)) return;
  if (!session.connector || !session.replyContext) return;
  const connector = connectors.get(session.connector);
  if (!connector) return;
  try {
    const target = connector.reconstructTarget(session.replyContext);
    await connector.replyMessage(target, text);
  } catch (err) {
    logger.warn(
      `Connector reply delivery failed for session ${session.id ?? "?"}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
