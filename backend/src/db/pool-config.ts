import fs from "node:fs";
import type { ConnectionOptions } from "tls";

const DEFAULT_RDS_CA_PATH = "/etc/ssl/rds/global-bundle.pem";

export type PgConnectionParams = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

/** Parse a PostgreSQL URL into discrete pg Pool fields (for Drizzle Kit — it ignores ssl when `url` is set). */
export function parseDatabaseUrl(url: string): PgConnectionParams {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 5432),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, "") || "postgres",
  };
}

/** Strip sslmode/ssl from URL when Pool.ssl is set explicitly (avoids pg-connection-string conflicts). */
export function stripSslQueryParams(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("sslmode");
    parsed.searchParams.delete("ssl");
    return parsed.toString();
  } catch {
    return url;
  }
}

export function resolveRdsCaPath(): string | undefined {
  const configured = process.env.RDS_CA_CERT_PATH?.trim();
  if (configured) return configured;
  if (fs.existsSync(DEFAULT_RDS_CA_PATH)) return DEFAULT_RDS_CA_PATH;
  return undefined;
}

function readRdsCa(caPath: string): ConnectionOptions {
  return {
    ca: fs.readFileSync(caPath, "utf8"),
    rejectUnauthorized: true,
  };
}

/** Runtime pool: explicit RDS_CA_CERT_PATH or default EC2 CA path if present. */
export function buildRdsPoolSsl(): ConnectionOptions | undefined {
  const caPath = resolveRdsCaPath();
  if (!caPath) return undefined;
  return readRdsCa(caPath);
}
