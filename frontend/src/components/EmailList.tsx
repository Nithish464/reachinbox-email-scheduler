"use client";

import { EmailJob } from "@/types/api";
import { StatusBadge } from "./StatusBadge";
import { EmptyState } from "./EmptyState";

function SkeletonRows() {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-8 py-4">
          <div className="h-3 w-40 animate-pulse rounded bg-surface-muted" />
          <div className="h-5 w-24 animate-pulse rounded-full bg-surface-muted" />
          <div className="h-3 flex-1 animate-pulse rounded bg-surface-muted" />
        </div>
      ))}
    </div>
  );
}

export function EmailList({
  jobs,
  loading,
  variant,
  onCompose,
}: {
  jobs: EmailJob[];
  loading: boolean;
  variant: "scheduled" | "sent";
  onCompose?: () => void;
}) {
  if (loading) return <SkeletonRows />;

  if (jobs.length === 0) {
    return (
      <div className="px-8 py-6">
        {variant === "scheduled" ? (
          <EmptyState
            title="No emails scheduled"
            description="Compose an email and pick a start time — it'll show up here the moment it's queued."
            actionLabel={onCompose ? "Compose new email" : undefined}
            onAction={onCompose}
          />
        ) : (
          <EmptyState
            title="No emails sent yet"
            description="Delivered and failed sends will appear here once your scheduled emails go out."
          />
        )}
      </div>
    );
  }

  return (
    <div className="divide-y divide-line">
      {jobs.map((job) => (
        <div
          key={job.id}
          className="flex items-center gap-4 px-8 py-4 transition hover:bg-surface-muted/60"
        >
          <span className="w-40 shrink-0 truncate text-sm font-medium text-ink">To, {job.toEmail}</span>
          <StatusBadge status={job.status} time={variant === "scheduled" ? job.scheduledTime : job.sentTime} />
          <span className="min-w-0 flex-1 truncate text-sm text-muted">
            <span className="font-medium text-ink">{job.subject}</span>
            {" — "}
            {job.body.replace(/\s+/g, " ").slice(0, 90)}
            {job.body.length > 90 ? "…" : ""}
          </span>
        </div>
      ))}
    </div>
  );
}
