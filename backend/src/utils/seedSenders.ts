import nodemailer from "nodemailer";
import { env } from "../config/env";
import { upsertSenderByEmail } from "../repositories/senderRepo";
import { runMigrations } from "../config/db";
import { pool } from "../config/db";

/**
 * Creates Ethereal (fake SMTP) test accounts and stores Sender rows so
 * the scheduler has multiple senders to round-robin across, each with
 * their own configurable hourly limit.
 *
 * Ethereal's account-creation API has been observed to hand back the
 * SAME cached account repeatedly for a given IP, even across separate
 * process runs several minutes apart - so we can't rely on it for
 * uniqueness. Instead we authenticate through ONE real Ethereal
 * account/transport, and give each Sender row a distinct "From"
 * identity (Sender.email) via sub-addressing (e.g. user+sender2@host).
 * Ethereal doesn't enforce From/auth-user matching, so each sender's
 * mail still lands in the same Ethereal inbox for preview, while our
 * own senders table - and therefore round-robin + per-sender rate
 * limiting - has genuinely distinct rows to work with. This mirrors how
 * real multi-tenant relays (SES, Postmark, etc.) work: one authenticated
 * connection, many "From" identities.
 *
 * Run with: npm run seed
 */
async function main() {
  await runMigrations();

  const count = parseInt(process.env.SEED_SENDER_COUNT ?? "3", 10);
  console.log(`Requesting one Ethereal test account to authenticate ${count} senders through...`);

  const account = await nodemailer.createTestAccount();
  console.log(`  Ethereal account: ${account.user} (view sent mail at https://ethereal.email/login)`);

  const [localPart, domain] = account.user.split("@");

  for (let i = 0; i < count; i++) {
    const fromAddress = i === 0 ? account.user : `${localPart}+sender${i + 1}@${domain}`;

    const sender = await upsertSenderByEmail({
      name: `ReachInbox Sender ${i + 1}`,
      email: fromAddress,
      smtpHost: account.smtp.host,
      smtpPort: account.smtp.port,
      smtpUser: account.user,
      smtpPass: account.pass,
      hourlyLimit: env.DEFAULT_MAX_EMAILS_PER_HOUR_PER_SENDER,
    });

    console.log(`  - ${sender.name} -> ${sender.email} (hourlyLimit=${sender.hourlyLimit})`);
  }

  console.log("Done. Senders are stored in the `senders` table.");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});