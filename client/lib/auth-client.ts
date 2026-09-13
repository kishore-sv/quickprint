import { createAuthClient } from "better-auth/react";
import { anonymousClient } from "better-auth/client/plugins";

const authBase =
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";

export const authClient = createAuthClient({
  baseURL: authBase,
  plugins: [anonymousClient()],
});

/** Post-auth redirect on the Next.js app (not the API host). */
export function appCallbackUrl(path = "/home"): string {
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${origin.replace(/\/$/, "")}${normalized}`;
}
