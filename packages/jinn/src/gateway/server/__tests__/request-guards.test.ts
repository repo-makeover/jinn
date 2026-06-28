import { describe, expect, it } from "vitest";
import { createPtyAccessToken } from "../../auth.js";
import { isBlockedCrossSiteWrite, isHostAllowed, isPtyUpgradeAllowed } from "../request-guards.js";

describe("isHostAllowed (DNS-rebinding guard)", () => {
  it("rejects non-loopback Host headers when bound to loopback", () => {
    expect(isHostAllowed(true, "127.0.0.1:7777")).toBe(true);
    expect(isHostAllowed(true, "localhost:7777")).toBe(true);
    expect(isHostAllowed(true, "[::1]:7777")).toBe(true);
    // A rebound attacker domain reaching the loopback listener.
    expect(isHostAllowed(true, "evil.example")).toBe(false);
    expect(isHostAllowed(true, "192.168.1.50:7777")).toBe(false);
  });

  it("is a no-op when bound to a network host (explicit opt-in)", () => {
    expect(isHostAllowed(false, "evil.example")).toBe(true);
    expect(isHostAllowed(false, "operator.tailnet.ts.net")).toBe(true);
  });
});

describe("isBlockedCrossSiteWrite (CSRF guard)", () => {
  it("blocks cross-site state-changing requests only", () => {
    expect(isBlockedCrossSiteWrite("POST", "cross-site")).toBe(true);
    expect(isBlockedCrossSiteWrite("DELETE", "cross-site")).toBe(true);
    // Same-origin dashboard and same-site (cross-port dev server) pass.
    expect(isBlockedCrossSiteWrite("POST", "same-origin")).toBe(false);
    expect(isBlockedCrossSiteWrite("POST", "same-site")).toBe(false);
    // Non-browser clients omit the header.
    expect(isBlockedCrossSiteWrite("POST", undefined)).toBe(false);
    // Safe methods are never blocked.
    expect(isBlockedCrossSiteWrite("GET", "cross-site")).toBe(false);
  });
});

describe("isPtyUpgradeAllowed (PTY WebSocket authorization)", () => {
  const secret = "gateway-api-token-xxxxxxxxxxxxxxxxxxxx";
  const sessionId = "sess-123";
  const base = {
    boundLoopback: true,
    reqHost: "127.0.0.1:7777",
    origin: "http://127.0.0.1:7777",
    sessionId,
    secret,
  };

  it("allows a same-origin upgrade with a valid session-bound token", () => {
    const token = createPtyAccessToken(sessionId, secret);
    expect(isPtyUpgradeAllowed({ ...base, token })).toBe(true);
  });

  it("rejects a cross-origin upgrade even with a valid token (WS bypasses CORS)", () => {
    const token = createPtyAccessToken(sessionId, secret);
    expect(isPtyUpgradeAllowed({ ...base, origin: "https://evil.example", token })).toBe(false);
  });

  it("rejects a non-loopback Host (rebinding) even with a valid token", () => {
    const token = createPtyAccessToken(sessionId, secret);
    expect(isPtyUpgradeAllowed({ ...base, reqHost: "evil.example", origin: undefined, token })).toBe(false);
  });

  it("rejects a missing, malformed, or wrong-session token", () => {
    expect(isPtyUpgradeAllowed({ ...base, token: "" })).toBe(false);
    expect(isPtyUpgradeAllowed({ ...base, token: "garbage" })).toBe(false);
    const otherToken = createPtyAccessToken("different-session", secret);
    expect(isPtyUpgradeAllowed({ ...base, token: otherToken })).toBe(false);
  });

  it("rejects an expired token", () => {
    const token = createPtyAccessToken(sessionId, secret, 1_000);
    // now is well past the 60s TTL
    expect(isPtyUpgradeAllowed({ ...base, token, now: 1_000 + 61_000 })).toBe(false);
  });
});
