import { createHmac, timingSafeEqual } from "crypto";
import type { Response } from "express";
import { env } from "../config/env";
import type { kiosks } from "../db/schema";

export const DISPLAY_SESSION_COOKIE = "qp_kiosk_display";

function sessionTtlMs(): number {
  return env.KIOSK_DISPLAY_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
}

type SessionPayload = {
  kioskId: string;
  kioskCode: string;
  exp: number;
};

function pepper(): string {
  return env.KIOSK_AGENT_TOKEN_PEPPER ?? env.BETTER_AUTH_SECRET;
}

function signPayload(encoded: string): string {
  return createHmac("sha256", pepper()).update(`display-session:${encoded}`).digest("base64url");
}

function encodePayload(payload: SessionPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(encoded: string): SessionPayload | null {
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as SessionPayload;
    if (!parsed.kioskId || !parsed.kioskCode || !parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function createDisplaySessionCookieValue(kiosk: typeof kiosks.$inferSelect): string {
  const payload: SessionPayload = {
    kioskId: kiosk.id,
    kioskCode: kiosk.kioskCode,
    exp: Date.now() + sessionTtlMs(),
  };
  const encoded = encodePayload(payload);
  const sig = signPayload(encoded);
  return `${encoded}.${sig}`;
}

export function verifyDisplaySessionCookie(
  cookieValue: string | undefined
): SessionPayload | null {
  if (!cookieValue) return null;
  const dot = cookieValue.lastIndexOf(".");
  if (dot <= 0) return null;
  const encoded = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);
  const expected = signPayload(encoded);
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  const payload = decodePayload(encoded);
  if (!payload || payload.exp < Date.now()) return null;
  return payload;
}

export function parseCookieHeader(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

export function setDisplaySessionCookie(res: Response, kiosk: typeof kiosks.$inferSelect): void {
  const value = createDisplaySessionCookieValue(kiosk);
  const secure = env.NODE_ENV === "production";
  const sameSite = secure ? "None" : "Lax";
  const parts = [
    `${DISPLAY_SESSION_COOKIE}=${encodeURIComponent(value)}`,
    "HttpOnly",
    "Path=/",
    `Max-Age=${Math.floor(sessionTtlMs() / 1000)}`,
    `SameSite=${sameSite}`,
  ];
  if (secure) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}
