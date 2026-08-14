import { redisConnection } from "../config/redis";

/**
 * Per-sender, per-hour-window counter backed by Redis.
 *
 * Key shape: rl:<senderId>:<YYYY-MM-DDTHH>
 * - INCR is atomic in Redis, so this is safe across multiple worker
 *   processes/instances (no in-memory counters, per the spec).
 * - We set an expiry slightly longer than an hour on first increment
 *   so stale windows clean themselves up automatically.
 *
 * tryConsume() either "spends" one slot for this sender in the given
 * hour window, or reports that the window is full so the caller can
 * push the job into the next window.
 */

function hourWindowKey(senderId: string, date: Date): string {
  const iso = date.toISOString(); // e.g. 2026-08-12T14:35:10.000Z
  const hourBucket = iso.slice(0, 13); // 2026-08-12T14
  return `rl:${senderId}:${hourBucket}`;
}

export function startOfNextHour(from: Date): Date {
  const d = new Date(from);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

export async function tryConsumeSlot(
  senderId: string,
  limit: number,
  at: Date = new Date()
): Promise<{ allowed: boolean; count: number }> {
  const key = hourWindowKey(senderId, at);

  const count = await redisConnection.incr(key);
  if (count === 1) {
    // First hit in this window - set TTL so old windows expire (65 min buffer).
    await redisConnection.expire(key, 65 * 60);
  }

  if (count > limit) {
    // Over the limit: release the slot we just took so it doesn't
    // permanently eat into this window's budget, then report denial.
    await redisConnection.decr(key);
    return { allowed: false, count: count - 1 };
  }

  return { allowed: true, count };
}

export async function getCurrentWindowCount(senderId: string, at: Date = new Date()): Promise<number> {
  const key = hourWindowKey(senderId, at);
  const val = await redisConnection.get(key);
  return val ? parseInt(val, 10) : 0;
}
