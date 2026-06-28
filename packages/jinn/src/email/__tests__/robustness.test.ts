import { describe, it, expect } from "vitest";
import { normalizeEmail, MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES, MAX_TEXT_BODY_CHARS } from "../normalize.js";
import type { EmailInboxConfig } from "../../shared/types.js";

const inbox = { id: "ops", address: "ops@example.com", username: "u", password: "p", imapHost: "h" } as EmailInboxConfig;

function buildRaw(opts: { attachments?: number; attachmentBytes?: number; bodyChars?: number } = {}): Buffer {
  const boundary = "BOUND";
  const parts: string[] = [
    "From: sender@example.com",
    "Subject: test",
    `Content-Type: multipart/mixed; boundary=${boundary}`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain",
    "",
    "x".repeat(opts.bodyChars ?? 10),
  ];
  for (let i = 0; i < (opts.attachments ?? 0); i++) {
    parts.push(
      `--${boundary}`,
      "Content-Type: application/octet-stream",
      `Content-Disposition: attachment; filename="a${i}.bin"`,
      "Content-Transfer-Encoding: base64",
      "",
      Buffer.alloc(opts.attachmentBytes ?? 10, 0x41).toString("base64"),
    );
  }
  parts.push(`--${boundary}--`, "");
  return Buffer.from(parts.join("\r\n"));
}

describe("email robustness caps (S7 / IOP-EMAIL-005)", () => {
  it("caps the attachment count", async () => {
    const out = await normalizeEmail(inbox, "uid-1", buildRaw({ attachments: MAX_ATTACHMENTS + 10, attachmentBytes: 4 }));
    expect(out.attachments.length).toBeLessThanOrEqual(MAX_ATTACHMENTS);
  });

  it("drops a single oversized attachment", async () => {
    // mailparser exposes attachment.content.length; an oversized one is dropped.
    const out = await normalizeEmail(inbox, "uid-2", buildRaw({ attachments: 1, attachmentBytes: MAX_ATTACHMENT_BYTES + 1024 }));
    expect(out.attachments.length).toBe(0);
  });

  it("truncates an enormous text body", async () => {
    const out = await normalizeEmail(inbox, "uid-3", buildRaw({ bodyChars: MAX_TEXT_BODY_CHARS + 5000 }));
    expect(out.record.textBody.length).toBeLessThanOrEqual(MAX_TEXT_BODY_CHARS);
  });
});
