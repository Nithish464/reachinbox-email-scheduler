# ReachInbox — Email Job Scheduler

A production-shaped email scheduler + dashboard: schedule cold email sends via
API, dispatch them at the right time with BullMQ (no cron, ever), survive
restarts without losing or duplicating a single email, and watch it all from
a "departures board" style dashboard.

```
reachinbox/
├── backend/     Express + TypeScript + BullMQ + Redis + Postgres + Ethereal SMTP
├── frontend/    Next.js + TypeScript + Tailwind
└── docker-compose.yml   Redis + Postgres for local dev
```

## 1. Quick start

### Prerequisites
- Node.js 18+
- Docker (recommended) or your own local Postgres 14+ and Redis 6+
- A Google Cloud OAuth 2.0 Client ID (for login) — see §4

### 1. Start Postgres + Redis
```bash
docker compose up -d
```

### 2. Backend
```bash
cd backend
cp .env.example .env      # fill in GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
npm install
npm run seed               # creates 3 fake Ethereal SMTP senders in the DB
npm run dev                 # http://localhost:4000
```
`npm run dev` runs migrations automatically on boot, starts the HTTP API,
and (by default) also starts the BullMQ worker in-process so you get a
fully working system with one command. To run the worker as its own
process instead (closer to how you'd deploy it), set
`RUN_WORKER_IN_PROCESS=false` in `.env` and run `npm run worker` in a
second terminal.

### 3. Frontend
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev                 # http://localhost:3000
```

Visit `http://localhost:3000`, sign in with Google, and you're in.

## 2. Setting up Ethereal Email

Ethereal accounts are created programmatically — no manual signup needed.
`backend/src/utils/seedSenders.ts` calls `nodemailer.createTestAccount()`
for each sender (3 by default, `SEED_SENDER_COUNT` in `.env`) and stores
the generated SMTP credentials in the `senders` table. Run it with:

```bash
npm run seed
```

Every email "sent" during development lands in Ethereal's fake inbox —
nothing is delivered to a real mailbox. The worker logs a preview URL
(`nodemailer.getTestMessageUrl`) for each send in `mailer.ts`; check the
terminal running the worker to click through and see the rendered email.

## 3. Setting up Google OAuth

1. Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Create an OAuth 2.0 Client ID (type: Web application).
3. Authorized redirect URI: `http://localhost:4000/api/auth/google/callback`
4. Authorized JavaScript origin: `http://localhost:3000`
5. Copy the Client ID / Secret into `backend/.env`.

## 4. Environment variables

See `backend/.env.example` and `frontend/.env.example` — every value that
affects scheduling behavior (concurrency, delay, rate limits) is
configurable there, nothing is hardcoded in source.

Key backend variables:

| Variable | Purpose |
|---|---|
| `WORKER_CONCURRENCY` | How many jobs the BullMQ worker processes in parallel |
| `MIN_DELAY_BETWEEN_EMAILS_MS` | Minimum gap enforced between *any* two sends, globally |
| `DEFAULT_MAX_EMAILS_PER_HOUR_PER_SENDER` | Default per-sender hourly cap (a batch can override it) |
| `RECONCILE_ON_BOOT` | Re-enqueue any DB jobs missing from the live queue on startup |
| `RUN_WORKER_IN_PROCESS` | Run the worker inside the API process (dev) vs. as a separate process (prod) |

## 5. Architecture

### How scheduling works
- `POST /api/emails/schedule` accepts `{ subject, body, leads[], startTime,
  delayMs, hourlyLimit }`.
- `schedulerService.scheduleEmailBatch` creates one `email_batches` row and
  fans out one `email_jobs` row **per recipient**, round-robining across all
  configured `senders` so no single mailbox absorbs the whole batch. Within
  each sender's timeline, leads are spaced `delayMs` apart starting at
  `startTime`.
- Each `email_jobs` row is enqueued as a **BullMQ delayed job**
  (`queue.add(..., { delay })`) with a **deterministic job id**
  (`email:<emailJobId>`) — this is what gives us idempotency: re-adding the
  same `emailJobId` is a safe no-op if that job is still live in the queue.
- **No cron anywhere.** BullMQ's delayed jobs are backed by a Redis sorted
  set and moved to the waiting list by BullMQ's own internal scheduler —
  not `setInterval`, not `node-cron`, not OS cron.

### How persistence on restart is handled
Two layers, belt and braces:
1. **BullMQ + Redis already survive process restarts.** Delayed/waiting
   jobs live in Redis, not in the Node process's memory, so restarting the
   API or worker process does not lose them. `docker-compose.yml` runs
   Redis with `--appendonly yes` so jobs also survive a *Redis* restart.
2. **Startup reconciliation** (`services/reconcile.ts`, run on every boot):
   queries Postgres for any `email_jobs` in `SCHEDULED`/`QUEUED`/`DELAYED`
   status that have no live job in the BullMQ queue (covers the crash
   window between "row written to Postgres" and "job added to Redis", or a
   Redis data loss event) and re-enqueues exactly those, using the same
   deterministic job id so nothing is duplicated.

Combined, this satisfies: after a restart, future scheduled emails still
send at the correct time, and nothing restarts from "day 1" or re-sends.

### How rate limiting & concurrency are implemented
- **Concurrency**: `Worker(queueName, processor, { concurrency:
  WORKER_CONCURRENCY })` — BullMQ runs up to N jobs in parallel per worker
  process, safely, since Postgres updates in the processor are per-row.
- **Minimum delay between sends**: enforced via BullMQ's built-in
  `limiter: { max: 1, duration: MIN_DELAY_BETWEEN_EMAILS_MS }` on the
  `Worker`. This throttles how fast BullMQ promotes jobs from *waiting* to
  *active*, globally, and is enforced by BullMQ using Redis — so it's
  correct even with multiple worker processes/instances, not just an
  in-memory `setTimeout`.
- **Emails per hour**: `services/rateLimiter.ts` implements a **Redis-backed
  per-sender-per-hour counter** (`INCR` on key `rl:<senderId>:<hour>`, with
  a ~65 minute TTL so old windows expire). `INCR` is atomic in Redis, so
  this is safe across multiple worker processes — it deliberately does
  **not** use an in-memory counter. Before actually sending, the worker
  calls `tryConsumeSlot(senderId, hourlyLimit)`:
  - If under the limit: the slot is consumed, the send proceeds.
  - If at the limit: the slot is released (no leak), the `email_jobs` row
    is marked `DELAYED` with a new `scheduledTime` at the start of the
    *next* hour, and the job is **re-enqueued** (same deterministic job
    id) for that time — it is never dropped or permanently failed. Because
    jobs are processed in ~scheduled-time order, this preserves relative
    order as much as possible.
- **Trade-off**: the global inter-send delay is enforced per *queue*, not
  per *sender*. With multiple senders, the effective per-sender delay can
  end up larger than configured (since all sends share one throttle). For
  this assignment's scope that's a deliberate simplification — a
  production version would give each sender its own BullMQ queue (or use
  BullMQ Pro's group rate limiting) so delay and hourly limits are both
  fully independent per sender.

### Behavior under load (1000+ emails at once)
- Scheduling 1000 leads creates 1000 `email_jobs` rows (fast, DB writes) and
  1000 BullMQ delayed jobs (Redis writes) up front — no synchronous sending
  happens during scheduling.
- As their delays elapse, jobs enter the `waiting` state and the worker
  drains them at `WORKER_CONCURRENCY` in parallel, gated by the
  `MIN_DELAY_BETWEEN_EMAILS_MS` limiter.
- Once any sender's hourly counter is exhausted, that sender's remaining
  jobs get pushed to the next hour window automatically (see above) — the
  queue does not back up indefinitely or start failing jobs; it just
  spreads the load across more hours.

### Idempotency
- One `email_jobs` row = one intended send. The worker checks
  `status === 'SENT'` before doing anything and skips if so.
- Every BullMQ job for a given `email_jobs` row uses the deterministic id
  `email:<emailJobId>`, so scheduling, reconciliation, and rate-limit
  rescheduling can never create two live jobs for the same row.
- **Known trade-off**: the DB is updated to `SENT` *after* the SMTP call
  returns. If the process crashes in the few-millisecond window between a
  successful send and that DB write, a naive retry could double-send. A
  fully exactly-once system would use a transactional outbox / idempotency
  key at the SMTP provider. Out of scope here, called out explicitly per
  the assignment's request to note trade-offs.

## 6. Features implemented

**Backend**
- [x] Schedule endpoint, relational storage (Postgres via `pg`, no ORM —
      raw SQL in `src/sql/001_init.sql` + a small repository layer)
- [x] BullMQ delayed jobs, no cron anywhere
- [x] Restart-safe (BullMQ/Redis persistence + startup reconciliation)
- [x] Idempotent sends (deterministic job ids + DB status guard)
- [x] Configurable worker concurrency
- [x] Configurable minimum delay between sends (BullMQ limiter)
- [x] Configurable, Redis-backed, multi-sender hourly rate limiting with
      automatic reschedule-not-drop behavior
- [x] Multiple senders, round-robin assignment per batch
- [x] Google OAuth login (Passport)
- [x] CSV/text lead parsing endpoint

**Frontend**
- [x] Google login → redirect to dashboard
- [x] Sidebar with user avatar / name / email and a logout menu
- [x] Scheduled and Sent tabs (sidebar nav, each with a live count), with
      loading + empty states
- [x] "Compose new email" full-page flow (matches the provided Figma):
      From (senders, auto round-robin), To (CSV/text upload → chip list),
      Subject, Delay-between-emails + Hourly limit fields, body editor,
      and a "Send later" popover with quick-pick time presets
- [x] Search across recipient/subject, manual refresh, 15s live polling
- [x] Reusable components: `Sidebar`, `TopBar`, `EmailList`, `StatusBadge`,
      `EmptyState`, `ComposePage`

The visual design (palette, type, spacing) was built directly off the
provided Figma file — colors were sampled from the Figma screenshots
(`#00A63E` brand green, peach/`#FFEDD4` scheduled tags, `#F4F7F5`
surfaces) and the layout mirrors it screen-for-screen: login card, left
sidebar with Compose + Scheduled/Sent nav, inbox-style row list, and the
full-page Compose view with its "Send later" time popover and CSV upload
→ chip pattern.

## 7. Assumptions & shortcuts

- Data layer uses raw SQL via `pg` rather than an ORM, because this
  sandbox environment couldn't reach `binaries.prisma.sh` to download
  Prisma's query engine. The schema and queries are still fully typed
  through a small repository layer (`src/repositories/*`) — swapping in
  Prisma later would be a mechanical change.
- CSV parsing is a permissive regex scan for email addresses rather than a
  strict CSV column parser, so it works whether the upload is a single
  "email" column, a full CSV with headers, or a plain list.
- The global inter-send delay (`MIN_DELAY_BETWEEN_EMAILS_MS`) is enforced
  per queue, not per sender — see the trade-off note in §5.
- No horizontal-scaling load test was run against real infra; behavior
  under 1000+ jobs is reasoned about from BullMQ's documented semantics,
  not benchmarked here.
- Session auth uses a signed cookie (`cookie-session`) rather than a
  server-side session store, to avoid adding another moving part for a
  take-home assignment.
- This was actually run end-to-end against real Postgres + Redis + a
  local SMTP catcher (Ethereal's own signup API wasn't reachable from
  the sandbox, so real Ethereal wasn't used here — it will work
  out-of-the-box on a machine with normal internet access). That test run
  caught and fixed two real bugs before submission: (1) BullMQ job IDs
  can't contain `:`, so the original `email:<id>` scheme was changed to
  `email-<id>`; (2) a batch's hourly limit was defaulting to the global
  env value instead of `null`, which silently overrode each sender's own
  configured `hourlyLimit` — fixed so per-sender limits are only
  overridden when a batch explicitly sets one. Verified afterwards:
  8 leads scheduled to a sender with `hourlyLimit=5` sent exactly 5 and
  correctly rescheduled the remaining 3 to the next hour window; a batch
  killed mid-flight and restarted sent every job exactly once, with the
  crash-recovery reconciler picking up an orphaned row with no manual
  intervention.
