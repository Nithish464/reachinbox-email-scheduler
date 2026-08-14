"use client";

import { useState } from "react";
import { Clock3, Send, ChevronDown, Plus, LogOut } from "lucide-react";
import { AppUser } from "@/types/api";

type Tab = "scheduled" | "sent";

export function Sidebar({
  user,
  tab,
  onTabChange,
  scheduledCount,
  sentCount,
  onCompose,
  onLogout,
}: {
  user: AppUser;
  tab: Tab;
  onTabChange: (t: Tab) => void;
  scheduledCount: number;
  sentCount: number;
  onCompose: () => void;
  onLogout: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-5">
      <div className="flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink">
          <span className="font-display text-sm font-bold text-white">R</span>
        </div>
        <span className="font-display text-lg font-bold text-ink">ReachInbox</span>
      </div>

      <div className="relative mt-6">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-surface-muted focus-visible:outline-brand"
        >
          {user.avatar ? (
            <img src={user.avatar} alt="" className="h-9 w-9 shrink-0 rounded-full" />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-pale font-display text-sm font-semibold text-brand-dark">
              {user.name?.[0]?.toUpperCase() ?? "U"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-none text-ink">{user.name}</p>
            <p className="mt-1 truncate text-xs leading-none text-muted">{user.email}</p>
          </div>
          <ChevronDown size={15} className="shrink-0 text-faint" />
        </button>

        {menuOpen && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-line bg-surface shadow-panel">
            <button
              onClick={onLogout}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-ink transition hover:bg-surface-muted"
            >
              <LogOut size={14} />
              Log out
            </button>
          </div>
        )}
      </div>

      <button
        onClick={onCompose}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full border border-brand px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand-pale focus-visible:outline-brand"
      >
        <Plus size={16} />
        Compose
      </button>

      <p className="mb-2 mt-6 px-2 font-display text-[11px] font-semibold uppercase tracking-wider text-faint">
        Jobs
      </p>

      <nav className="flex flex-col gap-1">
        <button
          onClick={() => onTabChange("scheduled")}
          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition focus-visible:outline-brand ${
            tab === "scheduled" ? "bg-brand-pale text-ink" : "text-muted hover:bg-surface-muted"
          }`}
        >
          <Clock3 size={16} className={tab === "scheduled" ? "text-brand-dark" : "text-faint"} />
          <span className="flex-1">Scheduled</span>
          <span className="font-display text-xs tabular text-muted">{scheduledCount}</span>
        </button>

        <button
          onClick={() => onTabChange("sent")}
          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition focus-visible:outline-brand ${
            tab === "sent" ? "bg-brand-pale text-ink" : "text-muted hover:bg-surface-muted"
          }`}
        >
          <Send size={16} className={tab === "sent" ? "text-brand-dark" : "text-faint"} />
          <span className="flex-1">Sent</span>
          <span className="font-display text-xs tabular text-muted">{sentCount}</span>
        </button>
      </nav>
    </aside>
  );
}
