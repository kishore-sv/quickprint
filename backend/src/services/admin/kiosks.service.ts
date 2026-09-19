import { randomBytes } from "crypto";
import { and, count, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import { db } from "../../db";
import { kiosks, printJobs } from "../../db/schema";
import { ConflictError, NotFoundError, ValidationError } from "../../utils/errors";
import {
  generateAgentToken,
  hashAgentToken,
} from "../kiosk-agent-auth.service";
import {
  generateDisplayToken,
  hashDisplayToken,
} from "../kiosk-display-auth.service";
import { isKioskServiceOnline } from "../kiosk-status.service";
import { extractPrinterSummary } from "../kiosk-health.service";
import { logOperationalEvent } from "../operational-log.service";
import { istDayStart } from "../../utils/ist";
import { env } from "../../config/env";
import { buildKioskDisplayUrl } from "../../utils/display-redirect-url";

function toBackendWsUrl(apiUrl: string): string {
  const url = new URL(apiUrl.replace(/\/$/, ""));
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws/kiosk";
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function buildKioskAgentEnv(input: {
  agent_id: string;
  agent_secret: string;
  backend_url?: string;
  backend_ws_url?: string;
  printer_mode?: string;
  cups_printer_name?: string;
}) {
  const backendUrl = (input.backend_url ?? env.BETTER_AUTH_URL).replace(/\/$/, "");
  const backendWsUrl = input.backend_ws_url ?? toBackendWsUrl(backendUrl);
  const printerMode = input.printer_mode ?? "cups";
  const cupsPrinter = input.cups_printer_name ?? "";

  return [
    "AGENT_ENV=production",
    `AGENT_ID=${input.agent_id}`,
    `AGENT_SECRET=${input.agent_secret}`,
    `BACKEND_URL=${backendUrl}`,
    `BACKEND_WS_URL=${backendWsUrl}`,
    "JOB_DIRECTORY=jobs",
    "DATABASE_PATH=data/agent.db",
    `PRINTER_MODE=${printerMode}`,
    `CUPS_PRINTER_NAME=${cupsPrinter}`,
    "CUPS_SERVER=",
    "LOG_LEVEL=INFO",
    "MAX_DOWNLOAD_BYTES=52428800",
    "MOCK_PRINT_DELAY_SECONDS=0.1",
    "MOCK_PRINT_FAILURE=false",
    "DOWNLOAD_TIMEOUT_SECONDS=120",
    "HEARTBEAT_INTERVAL_SECONDS=30",
    "HEALTH_REFRESH_INTERVAL_SECONDS=60",
    "WS_RECONNECT_MAX_DELAY_SECONDS=60",
    "RETRY_MAX_ATTEMPTS=3",
    "RETRY_BASE_DELAY_SECONDS=1.0",
    "RETRY_MAX_DELAY_SECONDS=30.0",
    "CUPS_COMMAND_TIMEOUT_SECONDS=30",
    "JOB_POLL_INTERVAL_SECONDS=1.0",
  ].join("\n");
}

export function buildKioskDisplayEnv(input: {
  kiosk_code: string;
  display_name: string;
  display_token: string;
  api_url?: string;
  display_url?: string;
}) {
  const apiUrl = (input.api_url ?? env.BETTER_AUTH_URL).replace(/\/$/, "");
  const displayUrl = input.display_url ?? buildKioskDisplayUrl(input.kiosk_code);

  return [
    `KIOSK_CODE=${input.kiosk_code}`,
    `KIOSK_DISPLAY_NAME=${input.display_name}`,
    `API_URL=${apiUrl}`,
    `DISPLAY_URL=${displayUrl}`,
    `DISPLAY_TOKEN=${input.display_token}`,
  ].join("\n");
}

function publicToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function listAdminKiosks(options: {
  page?: number;
  limit?: number;
  search?: string;
  status?: "ACTIVE" | "INACTIVE" | "MAINTENANCE" | "archived" | "active";
}) {
  const page = options.page ?? 1;
  const limit = Math.min(options.limit ?? 20, 100);
  const offset = (page - 1) * limit;
  const todayStart = istDayStart();

  const conditions = [];
  if (options.status === "archived") conditions.push(eq(kiosks.status, "INACTIVE"));
  else if (options.status === "active") conditions.push(eq(kiosks.status, "ACTIVE"));
  else if (options.status) conditions.push(eq(kiosks.status, options.status));

  if (options.search) {
    const q = `%${options.search}%`;
    conditions.push(
      or(ilike(kiosks.kioskCode, q), ilike(kiosks.name, q), ilike(kiosks.location, q))!
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(kiosks)
    .where(where)
    .orderBy(desc(kiosks.createdAt))
    .limit(limit + 1)
    .offset(offset);

  const has_more = rows.length > limit;
  const sliced = has_more ? rows.slice(0, limit) : rows;

  const items = await Promise.all(
    sliced.map(async (kiosk) => {
      const [jobsToday] = await db
        .select({ count: count() })
        .from(printJobs)
        .where(and(eq(printJobs.kioskId, kiosk.id), gte(printJobs.createdAt, todayStart)));

      const printer = extractPrinterSummary(kiosk.agentHealth as Record<string, unknown> | null);
      return serializeAdminKiosk(kiosk, {
        online: isKioskServiceOnline(kiosk),
        jobs_today: jobsToday?.count ?? 0,
        printer_name: printer.name,
        printer_status: printer.status,
      });
    })
  );

  return { items, page, limit, has_more };
}

function serializeAdminKiosk(
  kiosk: typeof kiosks.$inferSelect,
  extra: {
    online: boolean;
    jobs_today: number;
    printer_name: string | null;
    printer_status: string;
  }
) {
  return {
    id: kiosk.id,
    kiosk_code: kiosk.kioskCode,
    display_name: kiosk.name,
    location: kiosk.location,
    description: kiosk.description,
    status: kiosk.status,
    archived: kiosk.status === "INACTIVE",
    online: extra.online,
    last_seen: kiosk.lastSeenAt,
    jobs_today: extra.jobs_today,
    printer_name: extra.printer_name,
    printer_status: extra.printer_status,
    agent_version: kiosk.agentVersion,
    created_at: kiosk.createdAt,
    updated_at: kiosk.updatedAt,
  };
}

export async function getAdminKioskById(id: string) {
  const [kiosk] = await db.select().from(kiosks).where(eq(kiosks.id, id)).limit(1);
  if (!kiosk) return null;

  const todayStart = istDayStart();

  const [stats] = await db
    .select({
      total_jobs: count(),
      jobs_today: sql<number>`count(*) filter (where ${printJobs.createdAt} >= ${todayStart})`,
      total_pages: sql<number>`coalesce(sum(${printJobs.pageCount} * ${printJobs.copies}) filter (where ${printJobs.status} = 'COMPLETED'), 0)`,
      revenue_paise: sql<number>`coalesce(sum(${printJobs.amountPaise}) filter (where ${printJobs.status} = 'COMPLETED'), 0)`,
    })
    .from(printJobs)
    .where(eq(printJobs.kioskId, id));

  const printer = extractPrinterSummary(kiosk.agentHealth as Record<string, unknown> | null);

  return {
    ...serializeAdminKiosk(kiosk, {
      online: isKioskServiceOnline(kiosk),
      jobs_today: Number(stats?.jobs_today ?? 0),
      printer_name: printer.name,
      printer_status: printer.status,
    }),
    public_token: kiosk.publicToken,
    agent_health: kiosk.agentHealth,
    stats: {
      total_jobs: stats?.total_jobs ?? 0,
      jobs_today: Number(stats?.jobs_today ?? 0),
      total_pages: Number(stats?.total_pages ?? 0),
      revenue_paise: Number(stats?.revenue_paise ?? 0),
    },
  };
}

export async function createAdminKiosk(
  input: {
    kiosk_code: string;
    display_name: string;
    location?: string;
    description?: string;
  },
  actorId: string
) {
  const code = input.kiosk_code.trim().toUpperCase();
  if (!code) throw new ValidationError("Kiosk code is required");

  const [existing] = await db.select().from(kiosks).where(eq(kiosks.kioskCode, code)).limit(1);
  if (existing) throw new ConflictError("Kiosk code already exists");

  const agentPlain = generateAgentToken();
  const displayPlain = generateDisplayToken();

  const [kiosk] = await db
    .insert(kiosks)
    .values({
      kioskCode: code,
      publicToken: publicToken(),
      name: input.display_name.trim(),
      location: input.location?.trim() ?? null,
      description: input.description?.trim() ?? null,
      status: "ACTIVE",
      agentTokenHash: hashAgentToken(agentPlain),
      displayTokenHash: hashDisplayToken(displayPlain),
    })
    .returning();

  await logOperationalEvent({
    level: "INFO",
    event: "KIOSK_CREATED",
    actor: { type: "admin", id: actorId },
    resource: { type: "kiosk", id: kiosk.id },
    kioskId: kiosk.id,
    message: `Kiosk ${code} created`,
    metadata: { kiosk_code: code },
  });

  const provisioning = {
    kiosk_id: kiosk.id,
    agent_id: kiosk.id,
    agent_token: agentPlain,
    display_token: displayPlain,
    public_token: kiosk.publicToken,
  };

  return {
    kiosk: serializeAdminKiosk(kiosk, {
      online: false,
      jobs_today: 0,
      printer_name: null,
      printer_status: "unknown",
    }),
    provisioning,
    agent_env: buildKioskAgentEnv({
      agent_id: kiosk.id,
      agent_secret: agentPlain,
    }),
    display_env: buildKioskDisplayEnv({
      kiosk_code: kiosk.kioskCode,
      display_name: kiosk.name,
      display_token: displayPlain,
    }),
  };
}

export async function archiveAdminKiosk(id: string, actorId: string) {
  const [kiosk] = await db
    .update(kiosks)
    .set({ status: "INACTIVE", updatedAt: new Date() })
    .where(eq(kiosks.id, id))
    .returning();
  if (!kiosk) throw new NotFoundError("Kiosk not found");

  await logOperationalEvent({
    level: "INFO",
    event: "KIOSK_ARCHIVED",
    actor: { type: "admin", id: actorId },
    resource: { type: "kiosk", id: id },
    kioskId: id,
    message: `Kiosk ${kiosk.kioskCode} archived`,
  });

  return serializeAdminKiosk(kiosk, {
    online: false,
    jobs_today: 0,
    printer_name: null,
    printer_status: "unknown",
  });
}

export async function revealAdminKioskProvisioning(id: string, actorId: string) {
  const [kiosk] = await db.select().from(kiosks).where(eq(kiosks.id, id)).limit(1);
  if (!kiosk) throw new NotFoundError("Kiosk not found");

  const agentPlain = generateAgentToken();
  const displayPlain = generateDisplayToken();

  await db
    .update(kiosks)
    .set({
      agentTokenHash: hashAgentToken(agentPlain),
      displayTokenHash: hashDisplayToken(displayPlain),
      updatedAt: new Date(),
    })
    .where(eq(kiosks.id, id));

  await logOperationalEvent({
    level: "WARNING",
    event: "KIOSK_CREDENTIALS_REVEALED",
    actor: { type: "admin", id: actorId },
    resource: { type: "kiosk", id },
    kioskId: id,
    message: `Provisioning credentials revealed for kiosk ${kiosk.kioskCode}`,
    metadata: { kiosk_code: kiosk.kioskCode },
  });

  const provisioning = {
    kiosk_id: kiosk.id,
    agent_id: kiosk.id,
    agent_token: agentPlain,
    display_token: displayPlain,
    public_token: kiosk.publicToken,
  };

  return {
    provisioning,
    agent_env: buildKioskAgentEnv({
      agent_id: kiosk.id,
      agent_secret: agentPlain,
    }),
    display_env: buildKioskDisplayEnv({
      kiosk_code: kiosk.kioskCode,
      display_name: kiosk.name,
      display_token: displayPlain,
    }),
  };
}

export async function restoreAdminKiosk(id: string, actorId: string) {
  const [kiosk] = await db
    .update(kiosks)
    .set({ status: "ACTIVE", updatedAt: new Date() })
    .where(eq(kiosks.id, id))
    .returning();
  if (!kiosk) throw new NotFoundError("Kiosk not found");

  await logOperationalEvent({
    level: "INFO",
    event: "KIOSK_RESTORED",
    actor: { type: "admin", id: actorId },
    resource: { type: "kiosk", id: id },
    kioskId: id,
    message: `Kiosk ${kiosk.kioskCode} restored`,
  });

  return serializeAdminKiosk(kiosk, {
    online: isKioskServiceOnline(kiosk),
    jobs_today: 0,
    printer_name: null,
    printer_status: "unknown",
  });
}
