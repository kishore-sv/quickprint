import { relations } from "drizzle-orm";
import { kioskSessions } from "./schema/kiosk-sessions";
import { kiosks } from "./schema/kiosks";
import { payments } from "./schema/payments";
import { printJobEvents } from "./schema/print-job-events";
import { printJobs } from "./schema/print-jobs";
import { savedFiles } from "./schema/saved-files";

export const kiosksRelations = relations(kiosks, ({ many }) => ({
  sessions: many(kioskSessions),
  printJobs: many(printJobs),
}));

export const kioskSessionsRelations = relations(kioskSessions, ({ one }) => ({
  kiosk: one(kiosks, {
    fields: [kioskSessions.kioskId],
    references: [kiosks.id],
  }),
}));

export const savedFilesRelations = relations(savedFiles, ({ many }) => ({
  printJobs: many(printJobs),
}));

export const printJobsRelations = relations(printJobs, ({ one, many }) => ({
  kiosk: one(kiosks, {
    fields: [printJobs.kioskId],
    references: [kiosks.id],
  }),
  savedFile: one(savedFiles, {
    fields: [printJobs.savedFileId],
    references: [savedFiles.id],
  }),
  payments: many(payments),
  events: many(printJobEvents),
}));

export const printJobEventsRelations = relations(printJobEvents, ({ one }) => ({
  printJob: one(printJobs, {
    fields: [printJobEvents.printJobId],
    references: [printJobs.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  printJob: one(printJobs, {
    fields: [payments.printJobId],
    references: [printJobs.id],
  }),
}));
