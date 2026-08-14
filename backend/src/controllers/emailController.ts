import { Request, Response } from "express";
import { scheduleEmailBatch } from "../services/schedulerService";
import { parseLeadsFromText } from "../utils/parseLeads";
import { listByStatuses } from "../repositories/emailJobRepo";
import { findAllSenders } from "../repositories/senderRepo";

export async function parseLeadsFile(req: Request, res: Response) {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) return res.status(400).json({ error: "No file uploaded (field name: file)" });

  const leads = parseLeadsFromText(file.buffer.toString("utf-8"));
  res.json({ leads, count: leads.length });
}

export async function scheduleEmails(req: Request, res: Response) {
  try {
    const { subject, body, leads, startTime, delayMs, hourlyLimit } = req.body as {
      subject: string;
      body: string;
      leads: string[];
      startTime: string;
      delayMs?: number;
      hourlyLimit?: number;
    };

    if (!subject || !body) return res.status(400).json({ error: "subject and body are required" });
    if (!Array.isArray(leads) || leads.length === 0)
      return res.status(400).json({ error: "leads must be a non-empty array of email addresses" });
    if (!startTime) return res.status(400).json({ error: "startTime is required" });

    const user = req.user as any;

    const result = await scheduleEmailBatch({
      subject,
      body,
      leads,
      startTime: new Date(startTime),
      delayMs: delayMs ? Number(delayMs) : undefined,
      hourlyLimit: hourlyLimit ? Number(hourlyLimit) : undefined,
      createdBy: user?.email,
    });

    res.status(201).json({
      batchId: result.batch.id,
      jobCount: result.jobCount,
      message: `Scheduled ${result.jobCount} email(s).`,
    });
  } catch (err: any) {
    console.error("[scheduleEmails] error:", err);
    res.status(500).json({ error: err.message ?? "Failed to schedule emails" });
  }
}

export async function listScheduled(req: Request, res: Response) {
  const page = parseInt((req.query.page as string) ?? "1", 10);
  const pageSize = Math.min(parseInt((req.query.pageSize as string) ?? "50", 10), 200);

  const { items, total } = await listByStatuses(
    ["SCHEDULED", "QUEUED", "DELAYED", "SENDING"],
    "scheduled_time ASC",
    page,
    pageSize
  );

  res.json({ items, total, page, pageSize });
}

export async function listSent(req: Request, res: Response) {
  const page = parseInt((req.query.page as string) ?? "1", 10);
  const pageSize = Math.min(parseInt((req.query.pageSize as string) ?? "50", 10), 200);

  const { items, total } = await listByStatuses(["SENT", "FAILED"], "updated_at DESC", page, pageSize);

  res.json({ items, total, page, pageSize });
}

export async function listSenders(_req: Request, res: Response) {
  const senders = await findAllSenders();
  res.json({
    senders: senders.map((s) => ({ id: s.id, name: s.name, email: s.email, hourlyLimit: s.hourlyLimit })),
  });
}
