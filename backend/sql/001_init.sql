-- ReachInbox scheduler schema (PostgreSQL)
-- Run automatically on server boot (see src/config/db.ts runMigrations),
-- or manually with: psql $DATABASE_URL -f sql/001_init.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS senders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  smtp_host     TEXT NOT NULL,
  smtp_port     INTEGER NOT NULL,
  smtp_user     TEXT NOT NULL,
  smtp_pass     TEXT NOT NULL,
  hourly_limit  INTEGER NOT NULL DEFAULT 50,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_batches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject       TEXT NOT NULL,
  body          TEXT NOT NULL,
  start_time    TIMESTAMPTZ NOT NULL,
  delay_ms      INTEGER NOT NULL,
  hourly_limit  INTEGER, -- NULL means "use each sender's own hourly_limit"; set only when the caller explicitly overrides it for this batch
  total_leads   INTEGER NOT NULL,
  sender_id     UUID NOT NULL REFERENCES senders(id),
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  CREATE TYPE email_job_status AS ENUM
    ('SCHEDULED', 'QUEUED', 'DELAYED', 'SENDING', 'SENT', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS email_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        UUID NOT NULL REFERENCES email_batches(id),
  sender_id       UUID NOT NULL REFERENCES senders(id),
  to_email        TEXT NOT NULL,
  subject         TEXT NOT NULL,
  body            TEXT NOT NULL,
  scheduled_time  TIMESTAMPTZ NOT NULL,
  status          email_job_status NOT NULL DEFAULT 'SCHEDULED',
  bull_job_id     TEXT UNIQUE,
  attempts        INTEGER NOT NULL DEFAULT 0,
  sent_time       TIMESTAMPTZ,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_jobs_status ON email_jobs(status);
CREATE INDEX IF NOT EXISTS idx_email_jobs_scheduled_time ON email_jobs(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_email_jobs_sender_status ON email_jobs(sender_id, status);

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id   TEXT NOT NULL UNIQUE,
  email       TEXT NOT NULL,
  name        TEXT NOT NULL,
  avatar      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
