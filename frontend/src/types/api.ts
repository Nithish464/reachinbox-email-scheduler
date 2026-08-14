export type EmailJobStatus = "SCHEDULED" | "QUEUED" | "DELAYED" | "SENDING" | "SENT" | "FAILED";

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

export interface Sender {
  id: string;
  name: string;
  email: string;
  hourlyLimit: number;
}

export interface PaginatedJobs {
  items: EmailJob[];
  total: number;
  page: number;
  pageSize: number;
}
