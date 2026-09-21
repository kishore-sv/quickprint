import { jsonb, pgTable, timestamp, uuid, varchar, integer } from "drizzle-orm/pg-core";
import { kiosks } from "./kiosks";

export const kioskPrinterState = pgTable("kiosk_printer_state", {
  kioskId: uuid("kiosk_id")
    .primaryKey()
    .references(() => kiosks.id, { onDelete: "cascade" }),
  printerName: varchar("printer_name", { length: 255 }),
  connectionState: varchar("connection_state", { length: 32 }).notNull(),
  operationalState: varchar("operational_state", { length: 32 }).notNull(),
  displayState: varchar("display_state", { length: 32 }).notNull(),
  reasons: jsonb("reasons").$type<string[]>().notNull().default([]),
  rawReasons: jsonb("raw_reasons").$type<string[]>().notNull().default([]),
  capabilities: jsonb("capabilities").$type<Record<string, unknown> | null>(),
  telemetryLastSeenAt: timestamp("telemetry_last_seen_at", { withTimezone: true }),
  stateChangedAt: timestamp("state_changed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  lastSequence: integer("last_sequence").notNull().default(0),
  lastEventId: varchar("last_event_id", { length: 64 }),
  lastProbeAt: timestamp("last_probe_at", { withTimezone: true }),
});

export const kioskPrinterStateEvents = pgTable("kiosk_printer_state_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  kioskId: uuid("kiosk_id")
    .notNull()
    .references(() => kiosks.id, { onDelete: "cascade" }),
  connectionState: varchar("connection_state", { length: 32 }).notNull(),
  displayState: varchar("display_state", { length: 32 }).notNull(),
  reasons: jsonb("reasons").$type<string[]>().notNull().default([]),
  rawReasons: jsonb("raw_reasons").$type<string[]>().notNull().default([]),
  sequence: integer("sequence").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
