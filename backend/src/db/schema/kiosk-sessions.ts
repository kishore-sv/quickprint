import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { kiosks } from "./kiosks";

export const kioskSessions = pgTable(
  "kiosk_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kioskId: uuid("kiosk_id")
      .notNull()
      .references(() => kiosks.id),
    userId: text("user_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("ix_kiosk_sessions_user_id").on(t.userId),
    index("ix_kiosk_sessions_kiosk_id").on(t.kioskId),
  ]
);
