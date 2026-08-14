"use client";

import { Search, RefreshCw } from "lucide-react";

export function TopBar({
  query,
  onQueryChange,
  onRefresh,
  refreshing,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-8 py-4">
      <div className="relative flex-1 max-w-md">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search by recipient or subject"
          className="w-full rounded-lg border border-transparent bg-surface-muted py-2.5 pl-10 pr-3.5 text-sm text-ink placeholder:text-faint focus-visible:border-line focus-visible:outline-brand"
        />
      </div>
      <button
        onClick={onRefresh}
        aria-label="Refresh"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface-muted hover:text-ink focus-visible:outline-brand"
      >
        <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
      </button>
    </div>
  );
}
