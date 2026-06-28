import { describe, it, expect } from "vitest";
import { emailSenderAllowed } from "../service.js";

describe("emailSenderAllowed (C5 — email auto-ingest gate)", () => {
  it("fails closed: no allowlist means no sender auto-ingests", () => {
    expect(emailSenderAllowed(undefined, "alice@example.com")).toBe(false);
    expect(emailSenderAllowed([], "alice@example.com")).toBe(false);
  });

  it("matches a full address (case-insensitive)", () => {
    expect(emailSenderAllowed(["alice@example.com"], "Alice@Example.com")).toBe(true);
    expect(emailSenderAllowed(["alice@example.com"], "bob@example.com")).toBe(false);
  });

  it("matches a bare domain or @domain entry", () => {
    expect(emailSenderAllowed(["example.com"], "anyone@example.com")).toBe(true);
    expect(emailSenderAllowed(["@example.com"], "anyone@example.com")).toBe(true);
    expect(emailSenderAllowed(["example.com"], "anyone@evil.com")).toBe(false);
  });

  it("rejects a null/empty sender", () => {
    expect(emailSenderAllowed(["example.com"], null)).toBe(false);
    expect(emailSenderAllowed(["example.com"], "")).toBe(false);
  });
});
