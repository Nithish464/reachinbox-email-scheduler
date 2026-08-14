import { pool } from "../config/db";
import { EmailBatch } from "../types/domain";

function mapBatch(row: any): EmailBatch {
  return {
    id: row.id,
    subject: row.subject,
    body: row.body,
    startTime: row.start_time,
    delayMs: row.delay_ms,
    hourlyLimit: row.hourly_limit,
    totalLeads: row.total_leads,
    senderId: row.sender_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export async function createBatch(input: {
  subject: string;
  body: string;
  startTime: Date;
  delayMs: number;
  hourlyLimit: number | null;
  totalLeads: number;
  senderId: string;
  createdBy?: string;
}): Promise<EmailBatch> {
  const { rows } = await pool.query(
    `INSERT INTO email_batches (subject, body, start_time, delay_ms, hourly_limit, total_leads, sender_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      input.subject,
      input.body,
      input.startTime,
      input.delayMs,
      input.hourlyLimit,
      input.totalLeads,
      input.senderId,
      input.createdBy ?? null,
    ]
  );
  return mapBatch(rows[0]);
}
