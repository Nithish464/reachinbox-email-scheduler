import { pool } from "../config/db";
import { Sender } from "../types/domain";

function mapSender(row: any): Sender {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    smtpHost: row.smtp_host,
    smtpPort: row.smtp_port,
    smtpUser: row.smtp_user,
    smtpPass: row.smtp_pass,
    hourlyLimit: row.hourly_limit,
    createdAt: row.created_at,
  };
}

export async function findAllSenders(): Promise<Sender[]> {
  const { rows } = await pool.query("SELECT * FROM senders ORDER BY created_at ASC");
  return rows.map(mapSender);
}

export async function findSenderById(id: string): Promise<Sender | null> {
  const { rows } = await pool.query("SELECT * FROM senders WHERE id = $1", [id]);
  return rows[0] ? mapSender(rows[0]) : null;
}

export async function upsertSenderByEmail(input: {
  name: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  hourlyLimit: number;
}): Promise<Sender> {
  const { rows } = await pool.query(
    `INSERT INTO senders (name, email, smtp_host, smtp_port, smtp_user, smtp_pass, hourly_limit)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name,
       smtp_host = EXCLUDED.smtp_host,
       smtp_port = EXCLUDED.smtp_port,
       smtp_user = EXCLUDED.smtp_user,
       smtp_pass = EXCLUDED.smtp_pass
     RETURNING *`,
    [input.name, input.email, input.smtpHost, input.smtpPort, input.smtpUser, input.smtpPass, input.hourlyLimit]
  );
  return mapSender(rows[0]);
}
