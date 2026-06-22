import crypto, { timingSafeEqual } from "node:crypto";
import type { IncomingMessage as HttpRequest, ServerResponse } from "node:http";
import { readJsonBody } from "./http-helpers.js";

export const AUTH_COOKIE = "jinn_auth";
const AUTH_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const PTY_TOKEN_TTL_MS = 60_000;

function json(res: ServerResponse, data: unknown, status = 200, headers: Record<string, string> = {}): void {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(JSON.stringify(data));
}

export function generateApiToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function constantTimeEquals(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const ab = Buffer.from(a, "utf-8");
  const bb = Buffer.from(b, "utf-8");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function parseCookies(header: string | string[] | undefined): Record<string, string> {
  const raw = Array.isArray(header) ? header.join(";") : header ?? "";
  const out: Record<string, string> = {};
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

function bearerToken(req: HttpRequest): string | null {
  const raw = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization;
  if (!raw) return null;
  const match = /^Bearer\s+(.+)$/i.exec(raw.trim());
  return match?.[1]?.trim() || null;
}

function headerToken(req: HttpRequest): string | null {
  const raw = req.headers["x-jinn-token"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() || null;
}

function cookieToken(req: HttpRequest): string | null {
  return parseCookies(req.headers.cookie)[AUTH_COOKIE] || null;
}

export function isAuthenticatedRequest(req: HttpRequest, apiToken: string | undefined): boolean {
  if (!apiToken) return false;
  return (
    constantTimeEquals(bearerToken(req), apiToken) ||
    constantTimeEquals(headerToken(req), apiToken) ||
    constantTimeEquals(cookieToken(req), apiToken)
  );
}

function cookieHeader(token: string, maxAgeSeconds = AUTH_MAX_AGE_SECONDS): string {
  return [
    `${AUTH_COOKIE}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "SameSite=Strict",
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
  ].join("; ");
}

function clearCookieHeader(): string {
  return `${AUTH_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
}

export async function handleAuthApiRequest(
  req: HttpRequest,
  res: ServerResponse,
  pathname: string,
  method: string,
  apiToken: string,
): Promise<boolean> {
  if (method === "GET" && pathname === "/api/auth/status") {
    json(res, {
      required: true,
      authenticated: isAuthenticatedRequest(req, apiToken),
    });
    return true;
  }

  if (method === "POST" && pathname === "/api/auth/login") {
    const parsed = await readJsonBody(req, res, { maxBytes: 4096 });
    if (!parsed.ok) return true;
    const body = parsed.body as { token?: unknown } | null;
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    if (!constantTimeEquals(token, apiToken)) {
      json(res, { error: "Invalid gateway token" }, 401);
      return true;
    }
    json(res, { status: "ok" }, 200, { "Set-Cookie": cookieHeader(apiToken) });
    return true;
  }

  if (method === "POST" && pathname === "/api/auth/logout") {
    json(res, { status: "ok" }, 200, { "Set-Cookie": clearCookieHeader() });
    return true;
  }

  return false;
}

export function unauthorized(res: ServerResponse): void {
  json(res, { error: "Authentication required" }, 401);
}

export function createPtyAccessToken(sessionId: string, apiToken: string, now = Date.now()): string {
  const expiresAt = now + PTY_TOKEN_TTL_MS;
  const nonce = crypto.randomBytes(12).toString("base64url");
  const payload = `${sessionId}.${expiresAt}.${nonce}`;
  const sig = crypto.createHmac("sha256", apiToken).update(payload).digest("base64url");
  return `${expiresAt}.${nonce}.${sig}`;
}

export function verifyPtyAccessToken(sessionId: string, token: string | null | undefined, apiToken: string, now = Date.now()): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expiresRaw, nonce, sig] = parts;
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < now) return false;
  const payload = `${sessionId}.${expiresRaw}.${nonce}`;
  const expected = crypto.createHmac("sha256", apiToken).update(payload).digest("base64url");
  return constantTimeEquals(sig, expected);
}
