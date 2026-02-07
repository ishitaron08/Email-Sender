import { redis } from "../config/redis";
import { env } from "../config/environment";
import { logger } from "../config/logger";

/**
 * Redis-backed sliding-window rate limiter.
 *
 * Strategy:
 *   Key:  dispatch:rl:<senderId>:<hourBucket>
 *   hourBucket = Math.floor(Date.now() / 3_600_000)
 *
 * On each call to `consumeToken` we INCR the key.
 * If it's the first increment we set a 2-hour TTL (safety margin).
 * If the count exceeds MAX_EMAILS_PER_HOUR we deny the send
 * and return the number of seconds until the next window opens.
 */

const KEY_PREFIX = "dispatch:rl";
const WINDOW_MS = 3_600_000; // 1 hour in ms

function currentBucket(): number {
  return Math.floor(Date.now() / WINDOW_MS);
}

function keyFor(senderId: string, bucket: number): string {
  return `${KEY_PREFIX}:${senderId}:${bucket}`;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number; // 0 if allowed
}

/**
 * Try to consume one send-token for the given sender.
 * Returns whether the send is allowed + how many remain.
 */
export async function consumeToken(
  senderId: string
): Promise<RateLimitResult> {
  const bucket = currentBucket();
  const key = keyFor(senderId, bucket);

  // INCR is atomic — safe under concurrency
  const count = await redis.incr(key);

  // Set expiry only on first increment (new window)
  if (count === 1) {
    await redis.expire(key, 7200); // 2 hours
  }

  const limit = env.MAX_EMAILS_PER_HOUR;

  if (count > limit) {
    // Calculate seconds until the next hour bucket starts
    const nextBucketStart = (bucket + 1) * WINDOW_MS;
    const retryAfterSec = Math.ceil((nextBucketStart - Date.now()) / 1000);

    logger.warn(
      { senderId, count, limit, retryAfterSec },
      "Rate limit exceeded — dispatch will be rescheduled"
    );

    return { allowed: false, remaining: 0, retryAfterSec };
  }

  return {
    allowed: true,
    remaining: limit - count,
    retryAfterSec: 0,
  };
}

/**
 * Peek at how many sends remain without consuming a token.
 * Useful for the dashboard or pre-flight checks.
 */
export async function peekRemaining(senderId: string): Promise<number> {
  const key = keyFor(senderId, currentBucket());
  const count = parseInt((await redis.get(key)) ?? "0", 10);
  return Math.max(0, env.MAX_EMAILS_PER_HOUR - count);
}
