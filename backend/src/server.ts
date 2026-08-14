import { createApp } from "./app";
import { env } from "./config/env";
import { runMigrations } from "./config/db";
import { reconcilePendingJobs } from "./services/reconcile";
import { startEmailWorker } from "./workers/emailWorker";

async function main() {
  await runMigrations();

  if (env.RECONCILE_ON_BOOT) {
    await reconcilePendingJobs();
  }

  // The worker can also be run as a fully separate process (`npm run worker`)
  // for real horizontal scaling - see README. Running it here too is a dev
  // convenience so `npm run dev` alone gives you a working end-to-end system.
  if ((process.env.RUN_WORKER_IN_PROCESS ?? "true") === "true") {
    startEmailWorker();
  }

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`[server] listening on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  console.error("[server] fatal startup error:", err);
  process.exit(1);
});
