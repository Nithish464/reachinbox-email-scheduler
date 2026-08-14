"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Paperclip,
  Clock3,
  Upload,
  X,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  List,
  ListOrdered,
  Quote,
  Link2,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Sender } from "@/types/api";

function defaultStartTime() {
  const d = new Date(Date.now() + 5 * 60 * 1000);
  d.setSeconds(0, 0);
  return d;
}

function toLocalInputValue(d: Date) {
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

function presetLabel(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: "short" }) + ", " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function buildPresets(): { label: string; date: Date }[] {
  const now = new Date();
  const tomorrow9 = new Date(now);
  tomorrow9.setDate(now.getDate() + 1);
  tomorrow9.setHours(9, 0, 0, 0);

  const tomorrow13 = new Date(tomorrow9);
  tomorrow13.setHours(13, 0, 0, 0);

  const tomorrow18 = new Date(tomorrow9);
  tomorrow18.setHours(18, 0, 0, 0);

  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

  return [
    { label: "In 1 hour", date: inOneHour },
    { label: `Tomorrow, ${presetLabel(tomorrow9).split(", ")[1]}`, date: tomorrow9 },
    { label: `Tomorrow, ${presetLabel(tomorrow13).split(", ")[1]}`, date: tomorrow13 },
    { label: `Tomorrow, ${presetLabel(tomorrow18).split(", ")[1]}`, date: tomorrow18 },
  ];
}

export function ComposePage({ onClose, onScheduled }: { onClose: () => void; onScheduled: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [leads, setLeads] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(100);
  const [startTime, setStartTime] = useState<Date>(defaultStartTime());
  const [showSendLater, setShowSendLater] = useState(false);
  const [customTimeInput, setCustomTimeInput] = useState(toLocalInputValue(defaultStartTime()));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.senders().then((res) => setSenders(res.senders)).catch(() => {});
  }, []);

  async function handleFile(file: File) {
    setError(null);
    setParsing(true);
    try {
      const res = await api.parseLeadsFile(file);
      setLeads(res.leads);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't read that file.");
    } finally {
      setParsing(false);
    }
  }

  async function handleSubmit() {
    setError(null);
    if (!subject.trim() || !body.trim()) return setError("Add a subject and a body first.");
    if (leads.length === 0) return setError("Upload a list of recipients first.");

    setSubmitting(true);
    try {
      await api.schedule({
        subject,
        body,
        leads,
        startTime: startTime.toISOString(),
        delayMs: delaySeconds * 1000,
        hourlyLimit,
      });
      onScheduled();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't schedule these emails. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const presets = buildPresets();

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-8 py-4">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-sm font-semibold text-ink transition hover:text-brand-dark focus-visible:outline-brand"
        >
          <ArrowLeft size={18} />
          Compose New Email
        </button>

        <div className="flex items-center gap-2">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface-muted"
            title="Attach"
          >
            <Paperclip size={17} />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowSendLater((v) => !v)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-surface-muted ${
                showSendLater ? "bg-brand-pale text-brand-dark" : "text-muted"
              }`}
              title="Choose send time"
            >
              <Clock3 size={17} />
            </button>

            {showSendLater && (
              <div className="absolute right-0 top-full z-10 mt-2 w-72 rounded-xl2 border border-line bg-surface p-4 shadow-panel">
                <p className="font-display text-sm font-semibold text-ink">Send later</p>
                <input
                  type="datetime-local"
                  value={customTimeInput}
                  onChange={(e) => setCustomTimeInput(e.target.value)}
                  className="mt-3 w-full rounded-lg border border-line bg-surface-muted px-3 py-2 text-sm text-ink focus-visible:outline-brand"
                />
                <div className="mt-3 flex flex-col gap-0.5">
                  {presets.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => {
                        setStartTime(p.date);
                        setCustomTimeInput(toLocalInputValue(p.date));
                      }}
                      className="rounded-md px-2.5 py-1.5 text-left text-sm text-muted transition hover:bg-surface-muted hover:text-ink"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-end gap-3 border-t border-line pt-3">
                  <button
                    onClick={() => setShowSendLater(false)}
                    className="text-sm font-medium text-muted hover:text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setStartTime(new Date(customTimeInput));
                      setShowSendLater(false);
                    }}
                    className="rounded-full border border-brand px-4 py-1.5 text-sm font-semibold text-brand hover:bg-brand-pale"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-full border border-brand bg-surface px-5 py-2 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white disabled:opacity-60"
          >
            {submitting ? "Scheduling…" : "Send later"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto w-full max-w-3xl flex-1 px-8 py-6">
        <div className="flex items-center gap-3 border-b border-line py-2.5">
          <span className="w-16 shrink-0 text-sm text-faint">From</span>
          <div className="flex flex-1 flex-wrap items-center gap-1.5">
            {senders.length === 0 ? (
              <span className="text-sm text-faint">No senders configured yet</span>
            ) : (
              senders.map((s) => (
                <span key={s.id} className="rounded-full bg-surface-muted px-2.5 py-1 text-xs text-muted">
                  {s.email}
                </span>
              ))
            )}
          </div>
        </div>
        {senders.length > 0 && (
          <p className="mt-1.5 text-xs text-faint">
            Leads are distributed automatically across all {senders.length} connected senders.
          </p>
        )}

        <div className="mt-1 flex items-center gap-3 border-b border-line py-2.5">
          <span className="w-16 shrink-0 text-sm text-faint">To</span>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {leads.length === 0 ? (
              <span className="text-sm text-faint">recipient@example.com</span>
            ) : (
              <>
                {leads.slice(0, 3).map((l) => (
                  <span
                    key={l}
                    className="flex items-center gap-1 rounded-full border border-brand-pale bg-brand-pale px-2.5 py-1 text-xs text-brand-dark"
                  >
                    {l}
                  </span>
                ))}
                {leads.length > 3 && (
                  <span className="rounded-full border border-brand-pale bg-brand-pale px-2.5 py-1 text-xs text-brand-dark">
                    +{leads.length - 3}
                  </span>
                )}
                <button
                  onClick={() => setLeads([])}
                  aria-label="Clear recipients"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-faint hover:bg-surface-muted hover:text-ink"
                >
                  <X size={13} />
                </button>
              </>
            )}
          </div>
          <button
            onClick={() => fileInput.current?.click()}
            className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-brand-dark hover:underline"
          >
            <Upload size={14} />
            {parsing ? "Reading…" : leads.length > 0 ? "Replace list" : "Upload list"}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>

        <div className="flex items-center gap-3 border-b border-line py-2.5">
          <span className="w-16 shrink-0 text-sm text-faint">Subject</span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-faint focus-visible:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-6 border-b border-line py-3">
          <label className="flex items-center gap-2 text-sm text-muted">
            Delay between 2 emails
            <input
              type="number"
              min={1}
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(Number(e.target.value))}
              className="w-14 rounded-md border border-line bg-surface-muted px-2 py-1 text-center text-sm text-ink focus-visible:outline-brand"
            />
            <span className="text-faint">sec</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            Hourly limit
            <input
              type="number"
              min={1}
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(Number(e.target.value))}
              className="w-16 rounded-md border border-line bg-surface-muted px-2 py-1 text-center text-sm text-ink focus-visible:outline-brand"
            />
          </label>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl2 border border-line bg-surface-muted/40">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            placeholder="Type your reply…"
            className="w-full resize-none bg-transparent px-4 pt-4 text-sm leading-relaxed text-ink placeholder:text-faint focus-visible:outline-none"
          />
          {/* Decorative formatting toolbar - matches Figma; body is sent as plain text */}
          <div
            aria-hidden
            className="flex flex-wrap items-center gap-1 border-t border-line px-3 py-2 opacity-50"
          >
            {[Undo2, Redo2, Bold, Italic, Underline, AlignLeft, List, ListOrdered, Quote, Link2].map((Icon, i) => (
              <span key={i} className="flex h-7 w-7 items-center justify-center rounded text-faint">
                <Icon size={14} />
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-line bg-surface-muted px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-faint">Summary</p>
          <p className="mt-1 text-sm text-ink">
            <span className="font-semibold">{leads.length}</span> recipient{leads.length === 1 ? "" : "s"} · starts{" "}
            <span className="font-semibold">{startTime.toLocaleString()}</span> · spaced{" "}
            <span className="font-semibold">{delaySeconds}s</span> apart · capped at{" "}
            <span className="font-semibold">{hourlyLimit}</span>/hr per sender
          </p>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-rose-pale px-3.5 py-2.5 text-sm text-rose-text">{error}</p>
        )}
      </div>
    </div>
  );
}
