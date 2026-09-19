import { and, desc, eq, gte, ilike, lte, or } from "drizzle-orm";
import { db } from "../db";
import { operationalLogs } from "../db/schema";

export type LogLevel = "INFO" | "WARNING" | "ERROR";

export type LogActor = {
  type: string;
  id?: string | null;
};

export type LogResource = {
  type: string;
  id?: string | null;
};

const SENSITIVE_KEYS = [
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "card",
  "cvv",
  "agent_token",
  "display_token",
  "api_key",
];

function sanitizeMetadata(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(sanitizeMetadata);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const lower = key.toLowerCase();
      if (SENSITIVE_KEYS.some((s) => lower.includes(s))) {
        out[key] = "[redacted]";
      } else {
        out[key] = sanitizeMetadata(val);
      }
    }
    return out;
  }
  return value;
}

export async function logOperationalEvent(params: {
  level: LogLevel;
  event: string;
  actor?: LogActor | null;
  resource?: LogResource | null;
  kioskId?: string | null;
  printJobId?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  requestId?: string | null;
}) {
  const [row] = await db
    .insert(operationalLogs)
    .values({
      level: params.level,
      event: params.event,
      actorType: params.actor?.type ?? null,
      actorId: params.actor?.id ?? null,
      resourceType: params.resource?.type ?? null,
      resourceId: params.resource?.id ?? null,
      kioskId: params.kioskId ?? null,
      printJobId: params.printJobId ?? null,
      message: params.message ?? null,
      metadata: params.metadata ? (sanitizeMetadata(params.metadata) as Record<string, unknown>) : null,
      requestId: params.requestId ?? null,
    })
    .returning();
  return row;
}

export type ListLogsOptions = {
  page?: number;
  limit?: number;
  search?: string;
  level?: LogLevel;
  event?: string;
  kioskId?: string;
  resourceType?: string;
  from?: Date;
  to?: Date;
};

export async function listOperationalLogs(options: ListLogsOptions = {}) {
  const page = options.page ?? 1;
  const limit = Math.min(options.limit ?? 50, 100);
  const offset = (page - 1) * limit;

  const conditions = [];
  if (options.level) conditions.push(eq(operationalLogs.level, options.level));
  if (options.event) conditions.push(eq(operationalLogs.event, options.event));
  if (options.kioskId) conditions.push(eq(operationalLogs.kioskId, options.kioskId));
  if (options.resourceType) conditions.push(eq(operationalLogs.resourceType, options.resourceType));
  if (options.from) conditions.push(gte(operationalLogs.createdAt, options.from));
  if (options.to) conditions.push(lte(operationalLogs.createdAt, options.to));
  if (options.search) {
    const q = `%${options.search}%`;
    conditions.push(
      or(
        ilike(operationalLogs.event, q),
        ilike(operationalLogs.message, q),
        ilike(operationalLogs.actorId, q),
        ilike(operationalLogs.resourceId, q)
      )!
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(operationalLogs)
    .where(where)
    .orderBy(desc(operationalLogs.createdAt))
    .limit(limit + 1)
    .offset(offset);

  const has_more = rows.length > limit;
  const items = has_more ? rows.slice(0, limit) : rows;
  return { items, page, limit, has_more };
}

export async function getOperationalLogById(id: string) {
  const [row] = await db.select().from(operationalLogs).where(eq(operationalLogs.id, id)).limit(1);
  return row ?? null;
}

export function serializeOperationalLog(row: typeof operationalLogs.$inferSelect) {
  return {
    id: row.id,
    level: row.level,
    event: row.event,
    actor_type: row.actorType,
    actor_id: row.actorId,
    resource_type: row.resourceType,
    resource_id: row.resourceId,
    kiosk_id: row.kioskId,
    print_job_id: row.printJobId,
    message: row.message,
    metadata: row.metadata,
    request_id: row.requestId,
    created_at: row.createdAt,
  };
}
