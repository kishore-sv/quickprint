import { Worker } from "bullmq";
import { createRedisConnection, closeRedisConnection } from "../queues/redis";
import {
  REFUND_JOB_NAME,
  REFUND_QUEUE_NAME,
  type RefundJobPayload,
} from "../queues/refund.queue";
import { processRefund } from "../services/refund.service";
import { logger } from "../utils/logger";
import { pool } from "../db";

const workerConnection = createRedisConnection("refund-worker");

const worker = new Worker<RefundJobPayload>(
  REFUND_QUEUE_NAME,
  async (job) => {
    if (job.name !== REFUND_JOB_NAME) return;
    await processRefund(job.data.refundId);
  },
  {
    connection: workerConnection,
    concurrency: 2,
  }
);

worker.on("completed", (job) => {
  logger.info({ jobId: job.id, refundId: job.data.refundId }, "refund worker job completed");
});

worker.on("failed", (job, err) => {
  logger.warn(
    { jobId: job?.id, refundId: job?.data.refundId, err: err.message },
    "refund worker job failed"
  );
});

async function shutdown(signal: string) {
  logger.info({ signal }, "refund worker shutting down");
  await worker.close();
  await closeRedisConnection(workerConnection);
  await pool.end();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

logger.info("refund worker started");
