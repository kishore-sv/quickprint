import { createAuthClient } from "better-auth/react";
import { anonymousClient } from "better-auth/client/plugins";

/** REST API origin — single source of truth for backend host. */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Env-configured auth origin (SSR / scripts). Browser uses same-origin proxy via next.config rewrites. */
export const AUTH_BASE_URL =
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? API_BASE_URL;

function resolveAuthClientBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return AUTH_BASE_URL;
}

export const authClient = createAuthClient({
  baseURL: resolveAuthClientBaseUrl(),
  plugins: [anonymousClient()],
});

/** Post-auth redirect on the Next.js app (not the API host). */
export function appCallbackUrl(path = "/home"): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${origin.replace(/\/$/, "")}${normalized}`;
}
