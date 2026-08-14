import { env } from "../config/env";
import { findAllSenders } from "../repositories/senderRepo";
import { createBatch } from "../repositories/batchRepo";
import { createEmailJob, setJobQueued } from "../repositories/emailJobRepo";
import { enqueueEmailJob } from "../queues/emailQueue";

export type ScheduleEmailInput = {
  subject: string;
  body: string;
  leads: string[]; // recipient email addresses, already parsed from CSV/text
  startTime: Date;
  delayMs?: number;
  hourlyLimit?: number;
  createdBy?: string;
};

/**
 * Creates an EmailBatch + one EmailJob per lead, spreading leads evenly
 * across all available Senders (round robin) so no single mailbox is
 * hammered, then enqueues each job as a BullMQ delayed job.
 *
 * Jobs are spaced `delayMs` apart *within* each sender's timeline
 * starting at startTime - the queue's global limiter (see emailQueue.ts)
 * additionally guarantees a minimum gap between ANY two sends.
 */
export async function scheduleEmailBatch(input: ScheduleEmailInput) {
  const senders = await findAllSenders();
  if (senders.length === 0) {
    throw new Error("No senders configured. Run `npm run seed` in the backend first.");
  }

  const delayMs = input.delayMs ?? env.MIN_DELAY_BETWEEN_EMAILS_MS;

  const batch = await createBatch({
    subject: input.subject,
    body: input.body,
    startTime: input.startTime,
    delayMs,
    // Only set a batch-level override if the caller explicitly gave one.
    // Otherwise leave it null so the worker falls back to each sender's
    // OWN configured hourlyLimit (see emailWorker.ts) - that's what
    // makes the per-sender rate limit actually enforceable rather than
    // silently masked by a global default.
    hourlyLimit: input.hourlyLimit ?? null,
    totalLeads: input.leads.length,
    senderId: senders[0].id,
    createdBy: input.createdBy,
  });

  const nextSendPerSender = new Map<string, number>();
  for (const s of senders) nextSendPerSender.set(s.id, input.startTime.getTime());

  let created = 0;
  for (let i = 0; i < input.leads.length; i++) {
    const to = input.leads[i];
    const sender = senders[i % senders.length];

    const sendAtMs = nextSendPerSender.get(sender.id)!;
    nextSendPerSender.set(sender.id, sendAtMs + delayMs);
    const scheduledTime = new Date(sendAtMs);

    const job = await createEmailJob({
      batchId: batch.id,
      senderId: sender.id,
      toEmail: to,
      subject: input.subject,
      body: input.body,
      scheduledTime,
    });

    const bullJob = await enqueueEmailJob(job.id, scheduledTime);
    await setJobQueued(job.id, bullJob.id as string);
    created++;
  }

  return { batch, jobCount: created };
}
