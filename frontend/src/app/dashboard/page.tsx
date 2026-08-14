"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { AppUser, EmailJob } from "@/types/api";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { EmailList } from "@/components/EmailList";
import { ComposePage } from "@/components/ComposePage";

type Tab = "scheduled" | "sent";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [tab, setTab] = useState<Tab>("scheduled");
  const [scheduled, setScheduled] = useState<EmailJob[]>([]);
  const [sent, setSent] = useState<EmailJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const loadJobs = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setRefreshing(true);
    const [scheduledRes, sentRes] = await Promise.all([api.scheduled(), api.sent()]);
    setScheduled(scheduledRes.items);
    setSent(sentRes.items);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    api
      .me()
      .then(async ({ user }) => {
        setUser(user);
        setLoading(true);
        await loadJobs({ silent: true });
        setLoading(false);
      })
      .catch(() => router.replace("/login"));
  }, [router, loadJobs]);

  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => loadJobs({ silent: true }), 15000);
    return () => clearInterval(id);
  }, [user, loadJobs]);

  async function handleLogout() {
    await api.logout();
    router.replace("/login");
  }

  function handleScheduled() {
    setComposeOpen(false);
    setToast("Emails scheduled for dispatch.");
    loadJobs();
    setTimeout(() => setToast(null), 4000);
  }

  const filtered = useMemo(() => {
    const list = tab === "scheduled" ? scheduled : sent;
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((j) => j.toEmail.toLowerCase().includes(q) || j.subject.toLowerCase().includes(q));
  }, [tab, scheduled, sent, query]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-2 w-2 animate-pulseDot rounded-full bg-brand" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar
        user={user}
        tab={tab}
        onTabChange={setTab}
        scheduledCount={scheduled.length}
        sentCount={sent.length}
        onCompose={() => setComposeOpen(true)}
        onLogout={handleLogout}
      />

      <main className="min-w-0 flex-1">
        <TopBar query={query} onQueryChange={setQuery} onRefresh={() => loadJobs()} refreshing={refreshing} />
        <EmailList jobs={filtered} loading={loading} variant={tab} onCompose={() => setComposeOpen(true)} />
      </main>

      {composeOpen && <ComposePage onClose={() => setComposeOpen(false)} onScheduled={handleScheduled} />}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-ink px-4 py-3 text-sm text-white shadow-panel">
          {toast}
        </div>
      )}
    </div>
  );
}
