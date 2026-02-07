import Redis from "ioredis";
import { env } from "./environment";
import { logger } from "./logger";

/**
 * Shared Redis connection used by both the API (producer) and the worker (consumer).
 * BullMQ creates its own connections internally, but we also need one for rate-limit
 * counters and general-purpose caching.
 */
export function buildRedisConnection(): Redis {
  const connection = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
  });

  connection.on("connect", () =>
    logger.info("🔴 Redis connection established")
  );
  connection.on("error", (err) =>
    logger.error({ err }, "Redis connection error")
  );

  return connection;
}

/** Default shared instance — import this when you need ad-hoc Redis commands */
export const redis = buildRedisConnection();
