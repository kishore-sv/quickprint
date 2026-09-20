import { relations } from "drizzle-orm";
import { kioskSessions } from "./schema/kiosk-sessions";
import { kiosks } from "./schema/kiosks";
import { payments } from "./schema/payments";
import { refunds } from "./schema/refunds";
import { printJobDocuments } from "./schema/print-job-documents";
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
  printJobDocuments: many(printJobDocuments),
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
  refund: one(refunds, {
    fields: [printJobs.id],
    references: [refunds.printJobId],
  }),
  events: many(printJobEvents),
  documents: many(printJobDocuments),
}));

export const printJobDocumentsRelations = relations(printJobDocuments, ({ one }) => ({
  printJob: one(printJobs, {
    fields: [printJobDocuments.printJobId],
    references: [printJobs.id],
  }),
  savedFile: one(savedFiles, {
    fields: [printJobDocuments.savedFileId],
    references: [savedFiles.id],
  }),
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

export const refundsRelations = relations(refunds, ({ one }) => ({
  printJob: one(printJobs, {
    fields: [refunds.printJobId],
    references: [printJobs.id],
  }),
  payment: one(payments, {
    fields: [refunds.paymentId],
    references: [payments.id],
  }),
}));
