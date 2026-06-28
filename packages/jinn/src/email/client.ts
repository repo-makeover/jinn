import { ImapFlow } from "imapflow";
import type { EmailInboxConfig } from "../shared/types.js";
import { logger } from "../shared/logger.js";
import { MAX_RAW_MESSAGE_BYTES } from "./normalize.js";

export interface EmailFetchResult {
  providerMessageId: string;
  raw: Buffer;
}

export interface EmailMailboxClient {
  fetchUnread(inbox: EmailInboxConfig): Promise<EmailFetchResult[]>;
  /** Mark messages processed (\Seen) so the unread set drains and they are not re-fetched. */
  markSeen(inbox: EmailInboxConfig, providerMessageIds: string[]): Promise<void>;
}

export class FakeEmailMailboxClient implements EmailMailboxClient {
  private readonly messages = new Map<string, EmailFetchResult[]>();
  private readonly failures = new Set<string>();
  readonly seen = new Map<string, string[]>();

  setMessages(inboxId: string, messages: EmailFetchResult[]): void {
    this.messages.set(inboxId, [...messages]);
  }

  failInbox(inboxId: string): void {
    this.failures.add(inboxId);
  }

  async fetchUnread(inbox: EmailInboxConfig): Promise<EmailFetchResult[]> {
    if (this.failures.has(inbox.id)) throw new Error(`simulated inbox failure for ${inbox.id}`);
    return [...(this.messages.get(inbox.id) ?? [])];
  }

  async markSeen(inbox: EmailInboxConfig, providerMessageIds: string[]): Promise<void> {
    const prev = this.seen.get(inbox.id) ?? [];
    this.seen.set(inbox.id, [...prev, ...providerMessageIds]);
  }
}

export class ImapEmailMailboxClient implements EmailMailboxClient {
  async fetchUnread(inbox: EmailInboxConfig): Promise<EmailFetchResult[]> {
    const client = new ImapFlow({
      host: inbox.imapHost,
      port: inbox.imapPort ?? 993,
      secure: inbox.useTls !== false,
      auth: {
        user: inbox.username,
        pass: inbox.password,
      },
    });

    await client.connect();
    try {
      await client.mailboxOpen(inbox.folder || "INBOX");
      const query = inbox.unreadOnly === false ? { all: true } : { seen: false };
      const limit = Math.max(1, Math.min(100, inbox.maxMessagesPerPoll ?? 10));
      const ranges = await client.search(query);
      const rangeList = Array.isArray(ranges) ? ranges : [];
      const selected = rangeList.slice(-limit).reverse();
      const out: EmailFetchResult[] = [];
      for await (const message of client.fetch(selected, { uid: true, source: true })) {
        if (!message.source) continue;
        const raw = Buffer.isBuffer(message.source) ? message.source : Buffer.from(message.source);
        if (raw.length > MAX_RAW_MESSAGE_BYTES) {
          logger.warn(`[email] Skipping oversized message uid=${message.uid} (${raw.length} bytes) in inbox ${inbox.id}`);
          continue;
        }
        out.push({ providerMessageId: String(message.uid), raw });
      }
      return out;
    } finally {
      await client.logout().catch(() => {});
    }
  }

  async markSeen(inbox: EmailInboxConfig, providerMessageIds: string[]): Promise<void> {
    const uids = providerMessageIds.filter((id) => /^\d+$/.test(id)).map(Number);
    if (uids.length === 0) return;
    const client = new ImapFlow({
      host: inbox.imapHost,
      port: inbox.imapPort ?? 993,
      secure: inbox.useTls !== false,
      auth: { user: inbox.username, pass: inbox.password },
    });
    await client.connect();
    try {
      await client.mailboxOpen(inbox.folder || "INBOX");
      await client.messageFlagsAdd(uids, ["\\Seen"], { uid: true });
    } finally {
      await client.logout().catch(() => {});
    }
  }
}
