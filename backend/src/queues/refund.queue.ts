import { Queue } from "bullmq";
import { createRedisConnection } from "./redis";

export const REFUND_QUEUE_NAME = "refund-processing";
export const REFUND_JOB_NAME = "process-refund";

export type RefundJobPayload = {
  refundId: string;
};

let refundQueue: Queue<RefundJobPayload> | null = null;
let queueConnection: ReturnType<typeof createRedisConnection> | null = null;

export function getRefundQueue(): Queue<RefundJobPayload> {
  if (!refundQueue) {
    queueConnection = createRedisConnection("refund-queue");
    refundQueue = new Queue<RefundJobPayload>(REFUND_QUEUE_NAME, {
      connection: queueConnection,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }
  return refundQueue;
}

export async function enqueueRefundJob(refundId: string): Promise<void> {
  const queue = getRefundQueue();
  await queue.add(
    REFUND_JOB_NAME,
    { refundId },
    { jobId: `refund-${refundId}` }
  );
}

export async function closeRefundQueue(): Promise<void> {
  if (refundQueue) {
    await refundQueue.close();
    refundQueue = null;
  }
  if (queueConnection) {
    await queueConnection.quit();
    queueConnection = null;
  }
}
