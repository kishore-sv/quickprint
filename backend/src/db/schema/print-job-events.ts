import { index, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { printJobs } from "./print-jobs";

export const printJobEvents = pgTable(
  "print_job_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    printJobId: uuid("print_job_id")
      .notNull()
      .references(() => printJobs.id),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    message: varchar("message", { length: 512 }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("ix_print_job_events_print_job_id").on(t.printJobId)]
);
