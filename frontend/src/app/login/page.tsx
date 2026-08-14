"use client";

import { api } from "@/lib/api";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6">
      <div className="w-full max-w-sm rounded-xl2 border border-line bg-surface px-8 py-9 shadow-panel">
        <h1 className="text-center font-display text-2xl font-bold text-ink">Login</h1>

        <a
          href={api.loginUrl()}
          className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-lg bg-brand-pale px-4 py-3 text-sm font-medium text-ink transition hover:brightness-95 focus-visible:outline-brand"
        >
          <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.09-1.8 2.73v2.27h2.92c1.7-1.57 2.68-3.88 2.68-6.64z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.27c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34C2.44 15.98 5.48 18 9 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.97 10.71c-.18-.54-.28-1.11-.28-1.71s.1-1.17.28-1.71V4.95H.96A8.996 8.996 0 000 9c0 1.45.35 2.83.96 4.05l3.01-2.34z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.95l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"
            />
          </svg>
          Login with Google
        </a>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-line" />
          <span className="text-xs text-faint">or sign up through email</span>
          <div className="h-px flex-1 bg-line" />
        </div>

        <div className="flex flex-col gap-3">
          <input
            disabled
            placeholder="Email ID"
            className="w-full rounded-lg border border-line bg-surface-muted px-3.5 py-2.5 text-sm text-ink placeholder:text-faint disabled:cursor-not-allowed"
          />
          <input
            disabled
            type="password"
            placeholder="Password"
            className="w-full rounded-lg border border-line bg-surface-muted px-3.5 py-2.5 text-sm text-ink placeholder:text-faint disabled:cursor-not-allowed"
          />
        </div>

        <button
          disabled
          title="Email login isn't available yet — continue with Google above"
          className="mt-5 w-full cursor-not-allowed rounded-lg bg-brand/40 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Login
        </button>
        <p className="mt-3 text-center text-xs text-faint">
          Email sign-in is coming soon — continue with Google for now.
        </p>
      </div>
    </main>
  );
}
