import { Worker, Job } from "bullmq";
import { redisConnection } from "../config/redis";
import { env } from "../config/env";
import { EMAIL_QUEUE_NAME, EmailJobPayload, enqueueEmailJob, getQueueLimiterConfig } from "../queues/emailQueue";
import { tryConsumeSlot, startOfNextHour } from "../services/rateLimiter";
import { sendEmail } from "../services/mailer";
import { findEmailJobWithRelations, updateJobStatus } from "../repositories/emailJobRepo";

/**
 * Processes a single EmailJob:
 *  1. Idempotency guard - if this DB row is already SENT, skip (covers
 *     retries/duplicate deliveries from BullMQ or manual re-runs).
 *  2. Hourly rate-limit check (Redis-backed, safe across workers) using
 *     the batch's configured hourlyLimit for this sender. If the
 *     sender's current hour window is full, the job is NOT failed or
 *     dropped - it's rescheduled into the next hour window, preserving
 *     order as much as possible.
 *  3. Actually sends via Ethereal SMTP and marks SENT, or marks FAILED
 *     with the error (BullMQ will retry per queue defaultJobOptions
 *     before giving up).
 */
async function processEmailJob(job: Job<EmailJobPayload>) {
  const { emailJobId } = job.data;

  const emailJob = await findEmailJobWithRelations(emailJobId);

  if (!emailJob) {
    console.warn(`[worker] EmailJob ${emailJobId} not found in DB, skipping.`);
    return;
  }

  // --- Idempotency guard ---
  if (emailJob.status === "SENT") {
    console.log(`[worker] EmailJob ${emailJobId} already SENT, skipping duplicate.`);
    return;
  }

  // --- Rate limit check ---
  const limit = emailJob.batch.hourlyLimit ?? emailJob.sender.hourlyLimit;
  const { allowed } = await tryConsumeSlot(emailJob.senderId, limit);

  if (!allowed) {
    const nextWindow = startOfNextHour(new Date());
    console.log(
      `[worker] Hourly limit (${limit}) reached for sender ${emailJob.sender.email}. ` +
        `Rescheduling EmailJob ${emailJobId} to ${nextWindow.toISOString()}.`
    );

    await updateJobStatus(emailJobId, "DELAYED", { scheduledTime: nextWindow });

    // Re-enqueue with the SAME deterministic jobId (`email-<emailJobId>`).
    // Because the current job is about to complete (removed from the
    // queue), adding a new delayed job with that id is safe and is our
    // idempotency guarantee: at most one live BullMQ job per EmailJob.
    await enqueueEmailJob(emailJobId, nextWindow);
    return; // treated as a successful completion of *this* attempt
  }

  // --- Send ---
  await updateJobStatus(emailJobId, "SENDING", { incrementAttempts: true });

  try {
    await sendEmail(emailJob.sender as any, emailJob.toEmail, emailJob.subject, emailJob.body);
    await updateJobStatus(emailJobId, "SENT", { sentTime: new Date(), error: null });
    console.log(`[worker] Sent EmailJob ${emailJobId} -> ${emailJob.toEmail}`);
  } catch (err: any) {
    await updateJobStatus(emailJobId, "FAILED", { error: String(err?.message ?? err) });
    throw err; // let BullMQ apply its retry/backoff policy
  }
}

export function startEmailWorker() {
  const worker = new Worker<EmailJobPayload>(EMAIL_QUEUE_NAME, processEmailJob, {
    connection: redisConnection,
    concurrency: env.WORKER_CONCURRENCY,
    limiter: getQueueLimiterConfig(),
  });

  worker.on("completed", (job) => {
    console.log(`[worker] job ${job.id} completed`);
  });
  worker.on("failed", (job, err) => {
    console.error(`[worker] job ${job?.id} failed:`, err.message);
  });

  console.log(
    `[worker] started (concurrency=${env.WORKER_CONCURRENCY}, ` +
      `minDelayBetweenSends=${env.MIN_DELAY_BETWEEN_EMAILS_MS}ms)`
  );

  return worker;
}

// Allow running standalone: `npm run worker`
if (require.main === module) {
  startEmailWorker();
}
