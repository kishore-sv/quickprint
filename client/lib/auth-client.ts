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
