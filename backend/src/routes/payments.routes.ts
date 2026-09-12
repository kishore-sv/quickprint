import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import express, { Router } from "express";
import { env } from "../config/env";
import { db } from "../db";
import { payments, printJobEvents, printJobs } from "../db/schema";
import { requireAuth } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import {
  findOpenPaymentForJob,
  getRazorpayClient,
  markPaymentSuccessByOrderId,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "../services/payment.service";
import { getOwnedJob } from "../services/print-job.service";
import { PrintJobEventType } from "../types/enums";
import { AuthorizationError, NotFoundError, PaymentError, PrintJobError } from "../utils/errors";
import { ok } from "../utils/respond";
import { serializePrintJob } from "../utils/serializers";
import { z } from "zod";

export const paymentsRoutes = Router();

const createSchema = z.object({
  print_job_id: z.string().uuid(),
});

const verifySchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

paymentsRoutes.post(
  "/payments/create",
  requireAuth,
  validateBody(createSchema),
  async (req, res, next) => {
    try {
      const { print_job_id } = req.body as z.infer<typeof createSchema>;
      const job = await getOwnedJob(print_job_id, req.auth!.userId);
      if (!job.amountPaise || job.amountPaise < 1) {
        throw new PrintJobError("Job has no price");
      }
      if (job.paymentStatus === "PAID") {
        throw new PrintJobError("Job already paid");
      }

      const existing = await findOpenPaymentForJob(job.id);
      if (existing) {
        ok(res, {
          razorpay_order_id: existing.razorpayOrderId,
          amount_paise: existing.amountPaise,
          currency: existing.currency,
          key_id: env.RAZORPAY_KEY_ID,
        });
        return;
      }

      const client = getRazorpayClient();
      const order = await client.orders.create({
        amount: job.amountPaise,
        currency: job.currency,
        payment_capture: true,
        notes: {
          print_job_id: job.id,
          job_number: job.jobNumber,
        },
      });

      await db.insert(payments).values({
        id: randomUUID(),
        printJobId: job.id,
        razorpayOrderId: order.id,
        amountPaise: job.amountPaise,
        currency: job.currency,
        status: "CREATED",
      });

      await db
        .update(printJobs)
        .set({ status: "PAYMENT_PENDING", paymentStatus: "PENDING" })
        .where(eq(printJobs.id, job.id));

      await db.insert(printJobEvents).values({
        id: randomUUID(),
        printJobId: job.id,
        eventType: PrintJobEventType.PAYMENT_CREATED,
        metadata: { order_id: order.id },
      });

      ok(res, {
        razorpay_order_id: order.id,
        amount_paise: job.amountPaise,
        currency: job.currency,
        key_id: env.RAZORPAY_KEY_ID,
      });
    } catch (e) {
      next(e);
    }
  }
);

paymentsRoutes.post(
  "/payments/verify",
  requireAuth,
  validateBody(verifySchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof verifySchema>;
      if (
        !verifyPaymentSignature(
          body.razorpay_order_id,
          body.razorpay_payment_id,
          body.razorpay_signature
        )
      ) {
        throw new PaymentError("Payment verification failed", "PAYMENT_VERIFICATION_FAILED");
      }

      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.razorpayOrderId, body.razorpay_order_id))
        .limit(1);
      if (!payment) throw new NotFoundError("Payment not found");

      const job = await getOwnedJob(payment.printJobId, req.auth!.userId);
      if (job.userId !== req.auth!.userId) {
        throw new AuthorizationError();
      }

      const updated = await markPaymentSuccessByOrderId(
        body.razorpay_order_id,
        body.razorpay_payment_id,
        body.razorpay_payment_id
      );
      ok(res, serializePrintJob(updated));
    } catch (e) {
      next(e);
    }
  }
);

paymentsRoutes.post(
  "/payments/webhook",
  express.raw({ type: "application/json" }),
  async (req, res, next) => {
    try {
      const body = req.body as Buffer;
      const signature = req.headers["x-razorpay-signature"] as string;
      if (!verifyWebhookSignature(body, signature ?? "")) {
        throw new PaymentError("Invalid webhook signature");
      }

      const payload = JSON.parse(body.toString()) as {
        event?: string;
        payload?: { payment?: { entity?: { order_id?: string; id?: string } } };
      };

      if (payload.event !== "payment.captured") {
        res.json({ status: "ignored" });
        return;
      }

      const entity = payload.payload?.payment?.entity;
      const orderId = entity?.order_id;
      const paymentId = entity?.id;
      if (!orderId || !paymentId) {
        res.json({ status: "ignored" });
        return;
      }

      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.razorpayOrderId, orderId))
        .limit(1);
      if (!payment) {
        res.json({ status: "ignored" });
        return;
      }

      await markPaymentSuccessByOrderId(orderId, paymentId, paymentId);
      res.json({ status: "ok" });
    } catch (e) {
      next(e);
    }
  }
);
