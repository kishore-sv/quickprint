import { index, integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { paymentRecordStatusEnum } from "./enums";
import { printJobs } from "./print-jobs";

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    printJobId: uuid("print_job_id")
      .notNull()
      .references(() => printJobs.id),
    razorpayOrderId: varchar("razorpay_order_id", { length: 128 }).notNull().unique(),
    razorpayPaymentId: varchar("razorpay_payment_id", { length: 128 }),
    amountPaise: integer("amount_paise").notNull(),
    currency: varchar("currency", { length: 8 }).notNull(),
    status: paymentRecordStatusEnum("status").notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("ix_payments_print_job_id").on(t.printJobId),
    index("ix_payments_print_job_id_status_created_at").on(
      t.printJobId,
      t.status,
      t.createdAt
    ),
    index("ix_payments_razorpay_payment_id").on(t.razorpayPaymentId),
  ]
);
