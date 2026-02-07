/**
 * BullMQ Worker Entry Point
 *
 * Runs as a SEPARATE process from the API server.
 * Responsibilities:
 *   1. Pick up delayed jobs from the "outbound-dispatch" queue
 *   2. Check idempotency (has this email already been sent?)
 *   3. Check rate limit (has the hourly window been exceeded?)
 *   4. Send via Ethereal SMTP
 *   5. Record outcome in the database
 */
import "dotenv/config";
import { Worker, Job } from "bullmq";
import { QUEUE_NAME } from "./queue/dispatchQueue";
import { buildRedisConnection } from "./config/redis";
import { consumeToken } from "./queue/rateLimiter";
import { sendMail } from "./services/mailer.service";
import { prisma } from "./db/client";
import { logger } from "./config/logger";
import { DispatchJobData } from "./types";

const WORKER_CONCURRENCY = 5;

async function processDispatch(job: Job<DispatchJobData>): Promise<void> {
  const data = job.data;
  const log = logger.child({ jobId: job.id, dispatchId: data.dispatchId });

  log.info("Processing dispatch");

  // ─── Step 1: Idempotency check ──────────────────────────
  const existingLedger = await prisma.ledger.findFirst({
    where: { idempotencyKey: data.idempotencyKey },
  });

  if (existingLedger) {
    log.warn("Duplicate detected — already sent. Skipping.");
    return; // no-op, job completes successfully
  }

  // ─── Step 2: Verify dispatch is still actionable ────────
  const dispatch = await prisma.dispatch.findUnique({
    where: { id: data.dispatchId },
  });

  if (!dispatch || dispatch.status === "CANCELLED" || dispatch.status === "SENT") {
    log.info({ status: dispatch?.status }, "Dispatch no longer actionable");
    return;
  }

  // Mark as processing
  await prisma.dispatch.update({
    where: { id: data.dispatchId },
    data: { status: "PROCESSING", attempts: { increment: 1 } },
  });

  // ─── Step 3: Rate limit check ──────────────────────────
  const rateResult = await consumeToken(data.senderId);

  if (!rateResult.allowed) {
    log.warn(
      { retryAfterSec: rateResult.retryAfterSec },
      "Rate limited — rescheduling"
    );

    await prisma.dispatch.update({
      where: { id: data.dispatchId },
      data: { status: "RATE_LIMITED" },
    });

    // Move job back to delayed state with jitter
    const jitterMs = Math.floor(Math.random() * 30_000);
    const retryMs = rateResult.retryAfterSec * 1000 + jitterMs;
    await job.moveToDelayed(Date.now() + retryMs, job.token);

    // Throw to prevent BullMQ from marking as completed
    throw new Error(`RATE_LIMITED: retry in ${rateResult.retryAfterSec}s`);
  }

  // ─── Step 4: Send the email via Ethereal ────────────────
  const senderIdentity = await prisma.identity.findUnique({
    where: { id: data.senderId },
    select: { email: true, displayName: true },
  });

  const fromAddress = senderIdentity
    ? `${senderIdentity.displayName} <${senderIdentity.email}>`
    : data.senderId;

  const { messageId, previewUrl } = await sendMail({
    from: fromAddress,
    to: data.recipientEmail,
    subject: data.subject,
    html: data.body,
  });

  // ─── Step 5: Record success ─────────────────────────────
  await prisma.ledger.create({
    data: {
      dispatchId: data.dispatchId,
      idempotencyKey: data.idempotencyKey,
      smtpMessageId: messageId,
      outcome: "DELIVERED",
      rawResponse: { messageId, previewUrl },
    },
  });

  await prisma.dispatch.update({
    where: { id: data.dispatchId },
    data: { status: "SENT" },
  });

  log.info({ messageId, previewUrl }, "✅ Dispatch sent successfully");
}

// ─── Create the Worker ──────────────────────────────────

const worker = new Worker<DispatchJobData>(QUEUE_NAME, processDispatch, {
  connection: buildRedisConnection(),
  concurrency: WORKER_CONCURRENCY,
  limiter: {
    max: WORKER_CONCURRENCY,
    duration: 1000, // max 5 jobs per second as a safety net
  },
});

// ─── Worker Event Handlers ──────────────────────────────

worker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "Job completed");
});

worker.on("failed", async (job, err) => {
  if (!job) return;
  const data = job.data;

  logger.error(
    { jobId: job.id, dispatchId: data.dispatchId, err: err.message },
    "Job failed"
  );

  // If this was the final attempt, mark as FAILED in DB
  if (job.attemptsMade >= (job.opts.attempts ?? 3)) {
    await prisma.dispatch.update({
      where: { id: data.dispatchId },
      data: {
        status: "FAILED",
        lastError: err.message,
      },
    });
    logger.error({ dispatchId: data.dispatchId }, "Dispatch permanently failed");
  }
});

worker.on("error", (err) => {
  logger.error({ err }, "Worker error");
});

logger.info(
  { concurrency: WORKER_CONCURRENCY, queue: QUEUE_NAME },
  "🔧 Dispatch worker started"
);

// ─── Graceful Shutdown ──────────────────────────────────

async function shutdown(): Promise<void> {
  logger.info("Shutting down worker...");
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
