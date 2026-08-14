export type EmailJobStatus = "SCHEDULED" | "QUEUED" | "DELAYED" | "SENDING" | "SENT" | "FAILED";

export interface Sender {
  id: string;
  name: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  hourlyLimit: number;
  createdAt: string;
}

export interface EmailBatch {
  id: string;
  subject: string;
  body: string;
  startTime: string;
  delayMs: number;
  hourlyLimit: number | null; // null = fall back to each sender's own hourlyLimit
  totalLeads: number;
  senderId: string;
  createdBy: string | null;
  createdAt: string;
}

export interface EmailJob {
  id: string;
  batchId: string;
  senderId: string;
  toEmail: string;
  subject: string;
  body: string;
  scheduledTime: string;
  status: EmailJobStatus;
  bullJobId: string | null;
  attempts: number;
  sentTime: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  senderName?: string;
  senderEmail?: string;
}

export interface AppUser {
  id: string;
  googleId: string;
  email: string;
  name: string;
  avatar: string | null;
}
