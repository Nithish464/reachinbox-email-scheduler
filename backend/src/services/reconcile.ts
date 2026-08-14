import { emailQueue, enqueueEmailJob } from "../queues/emailQueue";
import { findPendingJobs } from "../repositories/emailJobRepo";
import { setJobQueued } from "../repositories/emailJobRepo";

/**
 * On boot, find EmailJob rows that are still pending (SCHEDULED, QUEUED,
 * or DELAYED) but have no corresponding live job in BullMQ/Redis - e.g.
 * because the process crashed between "create DB row" and "enqueue", or
 * because Redis lost data while Postgres kept it. Re-enqueue those so
 * nothing is silently dropped and nothing is duplicated (SENT jobs are
 * excluded, and enqueueEmailJob uses a deterministic jobId so re-adding
 * an already-live job is a safe no-op).
 *
 * This is what makes restarts safe on top of BullMQ's own Redis
 * persistence: BullMQ already survives process restarts by itself
 * (delayed jobs live in Redis, not memory, especially with AOF enabled
 * per docker-compose.yml). This is a belt-and-braces sweep for the edge
 * case where the two stores disagree.
 */
export async function reconcilePendingJobs() {
  const pending = await findPendingJobs();

  let reQueued = 0;
  for (const job of pending) {
    const existing = await emailQueue.getJob(`email-${job.id}`);
    if (existing) continue; // already live in the queue, nothing to do

    const bullJob = await enqueueEmailJob(job.id, new Date(job.scheduledTime));
    await setJobQueued(job.id, bullJob.id as string);
    reQueued++;
  }

  if (reQueued > 0) {
    console.log(`[reconcile] re-enqueued ${reQueued} job(s) that were missing from the live queue.`);
  } else {
    console.log("[reconcile] all pending jobs already present in the queue.");
  }
}
