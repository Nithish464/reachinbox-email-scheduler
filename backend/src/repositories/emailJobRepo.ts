import { pool } from "../config/db";
import { EmailJob, EmailJobStatus } from "../types/domain";

function mapJob(row: any): EmailJob {
  return {
    id: row.id,
    batchId: row.batch_id,
    senderId: row.sender_id,
    toEmail: row.to_email,
    subject: row.subject,
    body: row.body,
    scheduledTime: row.scheduled_time,
    status: row.status,
    bullJobId: row.bull_job_id,
    attempts: row.attempts,
    sentTime: row.sent_time,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    senderName: row.sender_name,
    senderEmail: row.sender_email,
  };
}

export async function createEmailJob(input: {
  batchId: string;
  senderId: string;
  toEmail: string;
  subject: string;
  body: string;
  scheduledTime: Date;
}): Promise<EmailJob> {
  const { rows } = await pool.query(
    `INSERT INTO email_jobs (batch_id, sender_id, to_email, subject, body, scheduled_time, status)
     VALUES ($1,$2,$3,$4,$5,$6,'SCHEDULED')
     RETURNING *`,
    [input.batchId, input.senderId, input.toEmail, input.subject, input.body, input.scheduledTime]
  );
  return mapJob(rows[0]);
}

export async function setJobQueued(id: string, bullJobId: string) {
  await pool.query(`UPDATE email_jobs SET status='QUEUED', bull_job_id=$2, updated_at=now() WHERE id=$1`, [
    id,
    bullJobId,
  ]);
}

export async function findEmailJobWithRelations(id: string): Promise<
  (EmailJob & {
    sender: { id: string; name: string; email: string; smtpHost: string; smtpPort: number; smtpUser: string; smtpPass: string; hourlyLimit: number };
    batch: { hourlyLimit: number | null };
  })
  | null
> {
  const { rows } = await pool.query(
    `SELECT ej.*, s.name AS sender_name, s.email AS sender_email, s.smtp_host, s.smtp_port,
            s.smtp_user, s.smtp_pass, s.hourly_limit AS sender_hourly_limit,
            eb.hourly_limit AS batch_hourly_limit
     FROM email_jobs ej
     JOIN senders s ON s.id = ej.sender_id
     JOIN email_batches eb ON eb.id = ej.batch_id
     WHERE ej.id = $1`,
    [id]
  );
  if (!rows[0]) return null;
  const row = rows[0];
  return {
    ...mapJob(row),
    sender: {
      id: row.sender_id,
      name: row.sender_name,
      email: row.sender_email,
      smtpHost: row.smtp_host,
      smtpPort: row.smtp_port,
      smtpUser: row.smtp_user,
      smtpPass: row.smtp_pass,
      hourlyLimit: row.sender_hourly_limit,
    },
    batch: { hourlyLimit: row.batch_hourly_limit },
  };
}

export async function updateJobStatus(
  id: string,
  status: EmailJobStatus,
  extra: Partial<{ scheduledTime: Date; sentTime: Date; error: string | null; incrementAttempts: boolean }> = {}
) {
  const sets: string[] = ["status = $2", "updated_at = now()"];
  const values: any[] = [id, status];
  let idx = 3;

  if (extra.scheduledTime) {
    sets.push(`scheduled_time = $${idx++}`);
    values.push(extra.scheduledTime);
  }
  if (extra.sentTime) {
    sets.push(`sent_time = $${idx++}`);
    values.push(extra.sentTime);
  }
  if (extra.error !== undefined) {
    sets.push(`error = $${idx++}`);
    values.push(extra.error);
  }
  if (extra.incrementAttempts) {
    sets.push(`attempts = attempts + 1`);
  }

  await pool.query(`UPDATE email_jobs SET ${sets.join(", ")} WHERE id = $1`, values);
}

export async function findPendingJobs(): Promise<EmailJob[]> {
  const { rows } = await pool.query(
    `SELECT * FROM email_jobs WHERE status IN ('SCHEDULED','QUEUED','DELAYED') ORDER BY scheduled_time ASC`
  );
  return rows.map(mapJob);
}

export async function listByStatuses(
  statuses: EmailJobStatus[],
  orderBy: "scheduled_time ASC" | "updated_at DESC",
  page: number,
  pageSize: number
): Promise<{ items: EmailJob[]; total: number }> {
  const { rows } = await pool.query(
    `SELECT ej.*, s.name AS sender_name, s.email AS sender_email
     FROM email_jobs ej
     JOIN senders s ON s.id = ej.sender_id
     WHERE ej.status = ANY($1)
     ORDER BY ej.${orderBy}
     LIMIT $2 OFFSET $3`,
    [statuses, pageSize, (page - 1) * pageSize]
  );
  const countRes = await pool.query(`SELECT COUNT(*)::int AS count FROM email_jobs WHERE status = ANY($1)`, [
    statuses,
  ]);
  return { items: rows.map(mapJob), total: countRes.rows[0].count };
}
