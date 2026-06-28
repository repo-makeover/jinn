import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  authenticateGatewayRequest,
  authRequiredForRequest,
  clearAuthCookieHeader,
  createAuthSession,
  consumePairingCode,
  createAuthState,
  createPairingCode,
  createPtyAccessToken,
  createScopedSessionToken,
  ensureGatewayAuthToken,
  listAuthSessions,
  isLoopbackHost,
  isNetworkHost,
  matchesGatewayAuthToken,
  issuePairingCode,
  normalizePairingCode,
  revokeAuthSession,
  scopedTokenForbidden,
  shouldRequireGatewayAuth,
  validateGatewayExposure,
  verifyAuthSession,
  verifyScopedSessionToken,
} from "../auth.js";

function req(headers: Record<string, string | undefined>, remoteAddress = "127.0.0.1") {
  return { headers, socket: { remoteAddress } } as any;
}

describe("gateway auth", () => {
  it("creates a persistent token under the supplied JINN_HOME with owner-only permissions", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "jinn-auth-"));
    const first = ensureGatewayAuthToken(home);
    const second = ensureGatewayAuthToken(home);
    expect(first).toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(32);

    const tokenFile = path.join(home, "gateway.json");
    const mode = fs.statSync(tokenFile).mode & 0o777;
    expect(mode).toBe(0o600);
    expect(JSON.parse(fs.readFileSync(tokenFile, "utf-8")).token).toBe(first);
  });

  it("accepts bearer auth and revocable browser sessions without accepting legacy raw-token cookies", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "jinn-auth-cookie-"));
    const session = createAuthSession(home, req({ "user-agent": "Mozilla/5.0" }, "100.64.1.2"));
    const scheme = "Bear" + "er";
    expect(authenticateGatewayRequest(req({ authorization: `${scheme} tok` }), "tok").ok).toBe(true);
    expect(authenticateGatewayRequest(req({ cookie: `theme=dark; jinn_auth=${session.secret}; jinn_device=${session.device.id}` }), "tok", home).ok).toBe(true);
    expect(authenticateGatewayRequest(req({ cookie: "theme=dark; jinn_auth=tok" }), "tok", home).ok).toBe(false);
    expect(authenticateGatewayRequest(req({ authorization: `${scheme} wrong`, cookie: "jinn_auth=wrong" }), "tok").ok).toBe(false);
  });

  it("does not require gateway bearer auth for loopback hook relay endpoint", () => {
    expect(authRequiredForRequest("POST", "/api/internal/hook")).toBe(false);
    expect(authRequiredForRequest("GET", "/api/internal/hook")).toBe(true);
  });

  it("requires auth on every binding by default, including loopback, unless explicitly disabled", () => {
    expect(isLoopbackHost("localhost:7777")).toBe(true);
    expect(isLoopbackHost("127.0.0.1:7777")).toBe(true);
    expect(isLoopbackHost("[::1]:7777")).toBe(true);
    expect(isLoopbackHost("100.95.1.62:7777")).toBe(false);
    // Default loopback now requires auth (closes the unauthenticated local
    // control plane: any local process / malicious web page could otherwise drive it).
    expect(shouldRequireGatewayAuth({ gateway: { host: "127.0.0.1" } } as any)).toBe(true);
    expect(shouldRequireGatewayAuth({ gateway: { host: "0.0.0.0" } } as any)).toBe(true);
    expect(shouldRequireGatewayAuth({ gateway: { host: "192.168.1.10" } } as any)).toBe(true);
    expect(shouldRequireGatewayAuth({ gateway: { host: "127.0.0.1", authRequired: true } } as any)).toBe(true);
    // Explicit opt-out is the only way to run without auth.
    expect(shouldRequireGatewayAuth({ gateway: { host: "127.0.0.1", authDisabled: true } } as any)).toBe(false);
  });

  it("refuses unauthenticated network binds unless the explicit insecure escape hatch is set", () => {
    expect(isNetworkHost("0.0.0.0")).toBe(true);
    expect(validateGatewayExposure({ gateway: { host: "0.0.0.0", authDisabled: true } } as any).ok).toBe(false);
    expect(validateGatewayExposure({ gateway: { host: "0.0.0.0", authDisabled: true, insecureAllowUnauthenticatedNetwork: true } } as any).ok).toBe(true);
  });

  it("reports safe auth state for local, remote, and already-paired browsers", () => {
    const config = { gateway: { host: "0.0.0.0" } } as any;
    expect(createAuthState(config, req({}, "127.0.0.1"), "tok")).toMatchObject({
      authRequired: true,
      authenticated: false,
      canBootstrapLocal: true,
      networkExposed: true,
    });
    expect(createAuthState(config, req({ host: "100.95.1.62:7777" }, "127.0.0.1"), "tok")).toMatchObject({
      authRequired: true,
      authenticated: false,
      canBootstrapLocal: false,
      networkExposed: true,
    });
    expect(createAuthState(config, req({}, "100.64.1.2"), "tok")).toMatchObject({
      authRequired: true,
      authenticated: false,
      canBootstrapLocal: false,
      networkExposed: true,
    });
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "jinn-auth-state-"));
    const session = createAuthSession(home, req({ "user-agent": "Mozilla/5.0" }, "100.64.1.2"));
    expect(createAuthState(config, req({ cookie: `jinn_auth=${session.secret}; jinn_device=${session.device.id}` }, "100.64.1.2"), "tok", home)).toMatchObject({
      authRequired: true,
      authenticated: true,
      canBootstrapLocal: false,
      networkExposed: true,
    });
  });

  it("creates single-use normalized pairing codes without storing the raw code", () => {
    const store = new Map<string, { expiresAt: number }>();
    const issued = issuePairingCode(store, 1_000, () => "ABCD-EFGH-JKLM");

    expect(issued.code).toBe("ABCD-EFGH-JKLM");
    expect(issued.expiresAt).toBe(301_000);
    expect(store.size).toBe(1);
    expect([...store.keys()][0]).not.toContain("ABCD");

    expect(normalizePairingCode("abcd efgh-jklm")).toBe("ABCDEFGHJKLM");
    expect(consumePairingCode(store, "abcd efgh jklm", 2_000)).toBe(true);
    expect(consumePairingCode(store, "ABCD-EFGH-JKLM", 2_001)).toBe(false);
  });

  it("rejects expired pairing codes and keeps gateway token fallback timing-safe", () => {
    const store = new Map<string, { expiresAt: number }>();
    const issued = issuePairingCode(store, 1_000, () => "WXYZ-2345-6789");

    expect(consumePairingCode(store, issued.code, issued.expiresAt + 1)).toBe(false);
    expect(matchesGatewayAuthToken("tok", "tok")).toBe(true);
    expect(matchesGatewayAuthToken("wrong", "tok")).toBe(false);
    expect(clearAuthCookieHeader()).toContain("Max-Age=0");
  });

  it("generates browser-friendly pairing codes", () => {
    const code = createPairingCode();
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(code).not.toMatch(/[01OI]/);
  });

  it("creates revocable browser auth sessions without storing raw secrets", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "jinn-auth-devices-"));
    const created = createAuthSession(home, req({ "user-agent": "Mozilla/5.0 Mac OS X" }, "100.64.1.2"), {
      name: "Remote browser",
      now: 1_000,
    });

    expect(created.secret).toHaveLength(43);
    expect(verifyAuthSession(home, created.device.id, created.secret)).toBe(true);

    const file = path.join(home, "auth-devices.json");
    const raw = fs.readFileSync(file, "utf-8");
    expect(raw).not.toContain(created.secret);
    expect(JSON.parse(raw).devices[0]).toMatchObject({
      id: created.device.id,
      name: "Remote browser",
      createdAt: "1970-01-01T00:00:01.000Z",
    });

    const listed = listAuthSessions(home, created.device.id);
    expect(listed).toEqual([
      expect.objectContaining({
        id: created.device.id,
        name: "Remote browser",
        current: true,
      }),
    ]);
    expect(JSON.stringify(listed)).not.toContain("tokenHash");

    revokeAuthSession(home, created.device.id);
    expect(verifyAuthSession(home, created.device.id, created.secret)).toBe(false);
  });

  it("mints and verifies scoped per-session agent tokens, rejecting forgery/expiry/cross-use", () => {
    const secret = "gateway-secret-aaaaaaaaaaaaaaaaaaaaaaaa";
    const token = createScopedSessionToken("sess-1", secret);
    expect(verifyScopedSessionToken(token, secret)).toBe("sess-1");
    // Wrong secret, garbage, and a (different-shaped) pty token are all rejected.
    expect(verifyScopedSessionToken(token, "other-secret")).toBeNull();
    expect(verifyScopedSessionToken("session:sess-1:9999999999999.deadbeef", secret)).toBeNull();
    expect(verifyScopedSessionToken("garbage", secret)).toBeNull();
    expect(verifyScopedSessionToken(createPtyAccessToken("sess-1", secret), secret)).toBeNull();
    // Expired token rejected.
    const expired = createScopedSessionToken("sess-1", secret, 1_000);
    expect(verifyScopedSessionToken(expired, secret, 1_000 + 31 * 24 * 60 * 60 * 1000)).toBeNull();
  });

  it("authenticates admin (bearer) vs session-scoped (agent) principals distinctly", () => {
    const secret = "tok-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    expect(authenticateGatewayRequest(req({ authorization: `Bearer ${secret}` }), secret).principal).toEqual({ kind: "admin" });
    const scoped = createScopedSessionToken("sess-9", secret);
    expect(authenticateGatewayRequest(req({ authorization: `Bearer ${scoped}` }), secret).principal).toEqual({ kind: "session", sessionId: "sess-9" });
    expect(authenticateGatewayRequest(req({ authorization: "Bearer nope" }), secret).ok).toBe(false);
  });

  it("forbids the operator control plane to session-scoped agent tokens but allows their working set", () => {
    // Forbidden: config / system / auth / logs / instances / connector bridge / org mutations.
    expect(scopedTokenForbidden("PUT", "/api/config")).toBe(true);
    expect(scopedTokenForbidden("GET", "/api/system/info")).toBe(true);
    expect(scopedTokenForbidden("POST", "/api/auth/pair")).toBe(true);
    expect(scopedTokenForbidden("GET", "/api/logs")).toBe(true);
    expect(scopedTokenForbidden("GET", "/api/instances")).toBe(true);
    expect(scopedTokenForbidden("POST", "/api/connectors/discord/incoming")).toBe(true);
    expect(scopedTokenForbidden("POST", "/api/connectors/discord/proxy")).toBe(true);
    expect(scopedTokenForbidden("PATCH", "/api/org/employees/ceo")).toBe(true);
    // Allowed working set: spawn/message/read sessions, scoped send, read org/email/status.
    expect(scopedTokenForbidden("POST", "/api/sessions")).toBe(false);
    expect(scopedTokenForbidden("POST", "/api/sessions/abc/message")).toBe(false);
    expect(scopedTokenForbidden("POST", "/api/connectors/slack/send")).toBe(false);
    expect(scopedTokenForbidden("GET", "/api/org")).toBe(false);
    expect(scopedTokenForbidden("GET", "/api/email/inboxes")).toBe(false);
  });

  it("keeps repeated local bootstrap sessions separately revocable", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "jinn-auth-local-devices-"));
    const first = createAuthSession(home, req({ "user-agent": "Mozilla/5.0 Macintosh Chrome" }, "127.0.0.1"), {
      kind: "local",
      now: 1_000,
    });
    const second = createAuthSession(home, req({ "user-agent": "Mozilla/5.0 Macintosh Chrome" }, "127.0.0.1"), {
      kind: "local",
      now: 2_000,
    });

    expect(first.device.id).toMatch(/^d_/);
    expect(second.device.id).toMatch(/^d_/);
    expect(second.device.id).not.toBe(first.device.id);
    expect(verifyAuthSession(home, first.device.id, first.secret)).toBe(true);
    expect(verifyAuthSession(home, second.device.id, second.secret)).toBe(true);
    expect(listAuthSessions(home)).toHaveLength(2);
  });
});
