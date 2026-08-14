import { EmailJobStatus } from "@/types/api";

function formatTimeLabel(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (isToday) return `Today, ${time}`;
  if (isTomorrow) return `Tomorrow, ${time}`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + `, ${time}`;
}

export function StatusBadge({ status, time }: { status: EmailJobStatus; time: string | null }) {
  if (status === "FAILED") {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-rose-pale px-2.5 py-1 text-xs font-medium text-rose-text">
        Failed
      </span>
    );
  }

  if (status === "SENT") {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-slate-pale px-2.5 py-1 text-xs font-medium text-slate-text">
        Sent{time ? ` · ${formatTimeLabel(time)}` : ""}
      </span>
    );
  }

  // SCHEDULED, QUEUED, DELAYED, SENDING all read as "pending dispatch"
  const label = status === "DELAYED" ? "Held for limit" : status === "SENDING" ? "Sending" : time ? formatTimeLabel(time) : "Scheduled";

  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-amber-pale px-2.5 py-1 text-xs font-medium text-amber-text">
      {label}
    </span>
  );
}
