import { Queue } from "bullmq";
import { redisConnection } from "../config/redis";
import { env } from "../config/env";

export const EMAIL_QUEUE_NAME = "email-send-queue";

// The `limiter` option throttles how fast BullMQ moves jobs from
// waiting -> active across the WHOLE queue: at most 1 job every
// MIN_DELAY_BETWEEN_EMAILS_MS. This is what gives us "minimum delay
// between individual email sends" without any cron/setInterval hacks -
// BullMQ enforces it internally using Redis, so it survives restarts
// and works correctly even with multiple worker processes.
export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { age: 60 * 60 * 24 * 7, count: 5000 },
    removeOnFail: { age: 60 * 60 * 24 * 7 },
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  },
});

export type EmailJobPayload = {
  emailJobId: string; // Prisma EmailJob.id - the idempotency key
};

/**
 * Enqueue (or re-enqueue) a single email job as a BullMQ delayed job.
 * jobId is deterministic (`email-<emailJobId>`) so calling this twice
 * for the same DB row is a no-op if that jobId is still present in the
 * queue - this is our idempotency guard against double scheduling.
 */
export async function enqueueEmailJob(emailJobId: string, sendAt: Date) {
  const delay = Math.max(0, sendAt.getTime() - Date.now());
  const jobId = `email-${emailJobId}`;
  return emailQueue.add(
    "send-email",
    { emailJobId } satisfies EmailJobPayload,
    {
      jobId,
      delay,
    }
  );
}

export function getQueueLimiterConfig() {
  return {
    max: 1,
    duration: env.MIN_DELAY_BETWEEN_EMAILS_MS,
  };
}
