import { betterAuth } from "better-auth";
import { anonymous, bearer } from "better-auth/plugins";
import { env, allowedCorsOrigins } from "../config/env";
import { pool } from "../db";

const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
  database: pool,
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: allowedCorsOrigins(),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false,
      },
    },
  },
  socialProviders: googleEnabled
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID!,
          clientSecret: env.GOOGLE_CLIENT_SECRET!,
          overrideUserInfoOnSignIn: true,
        },
      }
    : {},
  plugins: [anonymous(), bearer()],
});

export type AuthSession = typeof auth.$Infer.Session;
