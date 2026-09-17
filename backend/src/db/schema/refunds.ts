import { index, integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { refundStatusEnum } from "./enums";
import { payments } from "./payments";
import { printJobs } from "./print-jobs";

export const refunds = pgTable(
  "refunds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    printJobId: uuid("print_job_id")
      .notNull()
      .references(() => printJobs.id)
      .unique(),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id),
    razorpayPaymentId: varchar("razorpay_payment_id", { length: 128 }).notNull(),
    razorpayRefundId: varchar("razorpay_refund_id", { length: 128 }),
    amountPaise: integer("amount_paise").notNull(),
    currency: varchar("currency", { length: 8 }).notNull(),
    status: refundStatusEnum("status").notNull(),
    failureReason: varchar("failure_reason", { length: 512 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (t) => [
    index("ix_refunds_print_job_id").on(t.printJobId),
    index("ix_refunds_payment_id").on(t.paymentId),
    index("ix_refunds_status").on(t.status),
  ]
);
