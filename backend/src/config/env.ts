import dotenv from "dotenv";
dotenv.config();

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: parseInt(process.env.PORT ?? "4000", 10),
  FRONTEND_URL: required("FRONTEND_URL", "http://localhost:3000"),

  DATABASE_URL: required("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/reachinbox"),

  REDIS_HOST: process.env.REDIS_HOST ?? "localhost",
  REDIS_PORT: parseInt(process.env.REDIS_PORT ?? "6379", 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD ?? undefined,

  SESSION_SECRET: required("SESSION_SECRET", "dev-secret-change-me"),

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? "",
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL ?? "http://localhost:4000/api/auth/google/callback",

  // Queue / worker tuning - all configurable, nothing hardcoded per the spec.
  WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY ?? "5", 10),
  MIN_DELAY_BETWEEN_EMAILS_MS: parseInt(process.env.MIN_DELAY_BETWEEN_EMAILS_MS ?? "2000", 10),
  DEFAULT_MAX_EMAILS_PER_HOUR_PER_SENDER: parseInt(
    process.env.DEFAULT_MAX_EMAILS_PER_HOUR_PER_SENDER ?? "100",
    10
  ),
  RECONCILE_ON_BOOT: (process.env.RECONCILE_ON_BOOT ?? "true") === "true",
};
