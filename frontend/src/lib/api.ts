export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      message = data.error ?? message;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(message, res.status);
  }

  return res.json();
}

export const api = {
  me: () => request<{ user: import("@/types/api").AppUser }>("/api/auth/me"),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  loginUrl: () => `${API_BASE}/api/auth/google`,

  senders: () => request<{ senders: import("@/types/api").Sender[] }>("/api/emails/senders"),

  scheduled: (page = 1) =>
    request<import("@/types/api").PaginatedJobs>(`/api/emails/scheduled?page=${page}&pageSize=50`),

  sent: (page = 1) => request<import("@/types/api").PaginatedJobs>(`/api/emails/sent?page=${page}&pageSize=50`),

  parseLeadsFile: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ leads: string[]; count: number }>("/api/emails/leads/parse", {
      method: "POST",
      body: form,
    });
  },

  schedule: (payload: {
    subject: string;
    body: string;
    leads: string[];
    startTime: string;
    delayMs?: number;
    hourlyLimit?: number;
  }) =>
    request<{ batchId: string; jobCount: number; message: string }>("/api/emails/schedule", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export { ApiError };
