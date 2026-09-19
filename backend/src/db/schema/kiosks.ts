import { index, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { kioskStatusEnum } from "./enums";

export const kiosks = pgTable(
  "kiosks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kioskCode: varchar("kiosk_code", { length: 64 }).notNull().unique(),
    publicToken: varchar("public_token", { length: 64 }).unique(),
    name: varchar("name", { length: 255 }).notNull(),
    location: varchar("location", { length: 512 }),
    description: varchar("description", { length: 1024 }),
    status: kioskStatusEnum("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    agentTokenHash: varchar("agent_token_hash", { length: 128 }),
    displayTokenHash: varchar("display_token_hash", { length: 128 }),
    agentHealth: jsonb("agent_health"),
    agentVersion: varchar("agent_version", { length: 64 }),
  },
  (t) => [index("ix_kiosks_kiosk_code").on(t.kioskCode)]
);
