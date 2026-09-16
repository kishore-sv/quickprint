import type { Request } from "express";
import { allowedCorsOrigins, env, KIOSK_DISPLAY_BOOTSTRAP_ORIGIN } from "../config/env";

/** Canonical kiosk display page URL (no secrets or token query params). */
export function buildKioskDisplayUrl(kioskCode: string): string {
  const base = env.FRONTEND_URL.replace(/\/$/, "");
  return `${base}/kiosk/${encodeURIComponent(kioskCode)}`;
}

export function isDisplayFormBootstrapRequest(req: Pick<Request, "headers">): boolean {
  const contentType = req.headers["content-type"] ?? "";
  return String(contentType).includes("application/x-www-form-urlencoded");
}

export function displayBootstrapPairingErrorUrl(): string {
  return `${KIOSK_DISPLAY_BOOTSTRAP_ORIGIN}/error?code=pairing_failed`;
}

/** Allowed redirect targets after bootstrap pairing (frontend origins only). */
export function isAllowedDisplayRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (
      parsed.searchParams.has("displayToken") ||
      parsed.searchParams.has("display_token") ||
      parsed.searchParams.has("token")
    ) {
      return false;
    }
    const allowed = allowedCorsOrigins().filter((o) => o !== KIOSK_DISPLAY_BOOTSTRAP_ORIGIN);
    return allowed.some((origin) => {
      const allowedOrigin = new URL(origin);
      return (
        parsed.protocol === allowedOrigin.protocol &&
        parsed.hostname === allowedOrigin.hostname &&
        parsed.port === allowedOrigin.port
      );
    });
  } catch {
    return false;
  }
}
