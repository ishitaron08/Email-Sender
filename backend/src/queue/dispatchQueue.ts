import { Queue } from "bullmq";
import { buildRedisConnection } from "../config/redis";
import { DispatchJobData } from "../types";

/**
 * The single BullMQ queue for outbound email dispatches.
 *
 * Design notes:
 * - Queue name is unique to this application ("outbound-dispatch")
 * - We pass a *separate* Redis connection — BullMQ requires
 *   `maxRetriesPerRequest: null` which our builder already sets.
 * - Delayed jobs are stored in a Redis sorted set scored by
 *   their execution timestamp. No polling is needed.
 */
export const QUEUE_NAME = "outbound-dispatch";

export const dispatchQueue = new Queue<DispatchJobData>(QUEUE_NAME, {
  connection: buildRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 60_000, // 1 min → 2 min → 4 min
    },
    removeOnComplete: { age: 7 * 24 * 3600 }, // keep 7 days
    removeOnFail: { age: 30 * 24 * 3600 },    // keep 30 days
  },
});
