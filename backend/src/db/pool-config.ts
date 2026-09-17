import fs from "node:fs";
import type { ConnectionOptions } from "tls";

const DEFAULT_RDS_CA_PATH = "/etc/ssl/rds/global-bundle.pem";

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

export function buildRdsPoolSsl(): ConnectionOptions | undefined {
  const caPath = resolveRdsCaPath();
  if (!caPath) return undefined;
  return {
    ca: fs.readFileSync(caPath, "utf8"),
    rejectUnauthorized: true,
  };
}
