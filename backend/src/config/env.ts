import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url().default("redis://127.0.0.1:6379"),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  FRONTEND_URL: z.string().url(),
  ADMIN_URL: z.string().url().default("http://localhost:3001"),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  ADMIN_SEED_EMAIL: z.string().email().optional(),
  ADMIN_SEED_PASSWORD: z.string().min(8).optional(),
  ALLOW_ADMIN_SEED: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  S3_ENDPOINT: z.string().min(1),
  S3_REGION: z.string().default("ap-south-1"),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET_NAME: z
    .string()
    .min(1)
    .transform((s) => s.replace(/^["']|["']$/g, "")),
  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  MAX_UPLOAD_BYTES: z.coerce.number().default(52428800),
  LIBREOFFICE_BIN: z.string().default("libreoffice"),
  DOCUMENT_CONVERSION_TIMEOUT_MS: z.coerce.number().default(120000),
  DEFAULT_BW_SHEET_PAISE: z.coerce.number().default(200),
  DEFAULT_COLOR_SHEET_PAISE: z.coerce.number().default(1000),
  PRESIGNED_URL_EXPIRES: z.coerce.number().default(3600),
  PREVIEW_URL_EXPIRES: z.coerce.number().default(300),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(8000),
  PI_JOB_DOWNLOAD_EXPIRES: z.coerce.number().optional(),
  KIOSK_AGENT_TOKEN_PEPPER: z.string().optional(),
  JOB_STUCK_TIMEOUT_MINUTES: z.coerce.number().default(30),
  KIOSK_HEARTBEAT_TIMEOUT_SECONDS: z.coerce.number().default(90),
  PRINTER_TELEMETRY_STALE_SECONDS: z.coerce.number().default(30),
  KIOSK_DISPLAY_SESSION_TTL_DAYS: z.coerce.number().default(90),
});

/** Local Pi bootstrap HTTP server origin (fixed port; not configurable). */
export const KIOSK_DISPLAY_BOOTSTRAP_ORIGIN = "http://127.0.0.1:18765";

export type Env = z.infer<typeof envSchema>;

/** Normalize DATABASE_URL for pg compatibility across PostgreSQL providers. */
export function normalizeDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("channel_binding");

    const sslMode = parsed.searchParams.get("sslmode");
    const isNeon = parsed.hostname.endsWith(".neon.tech");
    if (
      isNeon &&
      (sslMode === "require" || sslMode === "prefer" || sslMode === "verify-ca")
    ) {
      parsed.searchParams.set("sslmode", "verify-full");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function withStorageAliases(raw: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return {
    ...raw,
    S3_ENDPOINT: raw.S3_ENDPOINT ?? raw.SUPABASE_S3_ENDPOINT,
    S3_REGION: raw.S3_REGION ?? raw.SUPABASE_S3_REGION,
    S3_ACCESS_KEY_ID: raw.S3_ACCESS_KEY_ID ?? raw.SUPABASE_S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: raw.S3_SECRET_ACCESS_KEY ?? raw.SUPABASE_S3_SECRET_ACCESS_KEY,
    S3_BUCKET_NAME: raw.S3_BUCKET_NAME ?? raw.SUPABASE_S3_BUCKET,
  };
}

function assertSupabaseS3Keys(accessKeyId: string): void {
  if (
    accessKeyId.startsWith("sb_publishable_") ||
    accessKeyId.startsWith("sb_secret_") ||
    accessKeyId.startsWith("eyJ")
  ) {
    throw new Error(
      "Invalid S3_ACCESS_KEY_ID: use Storage S3 access keys from Supabase Dashboard → Project Settings → Storage (S3 access keys), not publishable/anon API keys."
    );
  }
}

function loadEnv(): Env {
  const parsed = envSchema.safeParse(withStorageAliases(process.env));
  if (!parsed.success) {
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
  }
  assertSupabaseS3Keys(parsed.data.S3_ACCESS_KEY_ID);
  return {
    ...parsed.data,
    DATABASE_URL: normalizeDatabaseUrl(parsed.data.DATABASE_URL),
    PI_JOB_DOWNLOAD_EXPIRES:
      parsed.data.PI_JOB_DOWNLOAD_EXPIRES ?? parsed.data.PRESIGNED_URL_EXPIRES,
  };
}

export const env = loadEnv();

export function corsOrigins(): string[] {
  return env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean);
}

export function allowedCorsOrigins(): string[] {
  const origins = new Set([
    env.FRONTEND_URL,
    env.ADMIN_URL,
    ...corsOrigins(),
    KIOSK_DISPLAY_BOOTSTRAP_ORIGIN,
  ]);
  return [...origins];
}

export function isAllowedCorsOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  return allowedCorsOrigins().includes(origin);
}
