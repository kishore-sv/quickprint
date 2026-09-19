import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { kiosks } from "./kiosks";
import { printJobs } from "./print-jobs";

export const operationalLogLevelEnum = pgEnum("operativeloglevel", ["INFO", "WARNING", "ERROR"]);

export const operationalLogs = pgTable(
  "operational_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    level: operationalLogLevelEnum("level").notNull(),
    event: varchar("event", { length: 64 }).notNull(),
    actorType: varchar("actor_type", { length: 32 }),
    actorId: text("actor_id"),
    resourceType: varchar("resource_type", { length: 64 }),
    resourceId: text("resource_id"),
    kioskId: uuid("kiosk_id").references(() => kiosks.id, { onDelete: "set null" }),
    printJobId: uuid("print_job_id").references(() => printJobs.id, { onDelete: "set null" }),
    message: varchar("message", { length: 1024 }),
    metadata: jsonb("metadata"),
    requestId: varchar("request_id", { length: 128 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("ix_operational_logs_created_at").on(t.createdAt),
    index("ix_operational_logs_event").on(t.event),
    index("ix_operational_logs_level").on(t.level),
    index("ix_operational_logs_kiosk_id").on(t.kioskId),
    index("ix_operational_logs_print_job_id").on(t.printJobId),
    index("ix_operational_logs_resource").on(t.resourceType, t.resourceId),
  ]
);
