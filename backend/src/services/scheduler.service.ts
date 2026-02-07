import { createHash } from "crypto";
import { prisma } from "../db/client";
import { dispatchQueue } from "../queue/dispatchQueue";
import { logger } from "../config/logger";
import { ScheduleEmailPayload, DispatchJobData } from "../types";

/**
 * Core scheduling logic:
 *  1. Create a Campaign row
 *  2. Create Dispatch rows for each recipient
 *  3. Enqueue delayed BullMQ jobs
 *
 * Idempotency:
 *  - Each dispatch gets a deterministic key = sha256(campaignId + email + scheduledAt)
 *  - The DB column is UNIQUE — duplicate inserts are rejected
 *  - BullMQ job ID = dispatch UUID — re-enqueue is a no-op
 */
export async function scheduleEmailBatch(
  senderId: string,
  payload: ScheduleEmailPayload
) {
  const scheduledAt = new Date(payload.scheduledAt);
  const nowMs = Date.now();
  const delayMs = Math.max(scheduledAt.getTime() - nowMs, 0);

  // 1 — Create campaign
  const campaign = await prisma.campaign.create({
    data: {
      ownerId: senderId,
      title: payload.campaignTitle,
      subjectTemplate: payload.subject,
      bodyTemplate: payload.body,
      status: "ACTIVE",
    },
  });

  logger.info(
    { campaignId: campaign.id, recipients: payload.recipients.length },
    "Campaign created"
  );

  // 2 — Create dispatch rows + enqueue jobs
  const dispatches = [];

  for (const recipient of payload.recipients) {
    const idempotencyKey = buildIdempotencyKey(
      campaign.id,
      recipient.email,
      payload.scheduledAt
    );

    // Upsert-style: skip if this exact dispatch already exists
    const existing = await prisma.dispatch.findUnique({
      where: { idempotencyKey },
    });

    if (existing) {
      logger.debug({ idempotencyKey }, "Duplicate dispatch skipped");
      dispatches.push(existing);
      continue;
    }

    const dispatch = await prisma.dispatch.create({
      data: {
        campaignId: campaign.id,
        senderId,
        recipientEmail: recipient.email,
        recipientName: recipient.name ?? null,
        idempotencyKey,
        status: "SCHEDULED",
        scheduledAt,
      },
    });

    // 3 — Enqueue with deterministic job ID (idempotent across restarts)
    const jobData: DispatchJobData = {
      dispatchId: dispatch.id,
      campaignId: campaign.id,
      senderId,
      recipientEmail: recipient.email,
      recipientName: recipient.name,
      subject: payload.subject,
      body: payload.body,
      idempotencyKey,
    };

    await dispatchQueue.add("send-email", jobData, {
      jobId: dispatch.id, // deterministic — prevents duplicates in Redis
      delay: delayMs,
    });

    // Mark as queued now that the BullMQ job exists
    await prisma.dispatch.update({
      where: { id: dispatch.id },
      data: { status: "QUEUED" },
    });

    dispatches.push({ ...dispatch, status: "QUEUED" });
  }

  // If all recipients are queued, campaign is fully active
  logger.info(
    { campaignId: campaign.id, queued: dispatches.length },
    "All dispatches enqueued"
  );

  return { campaign, dispatches };
}

/**
 * Recovery sweep — call this on server startup.
 * Finds SCHEDULED rows whose time has passed but that never got queued
 * (e.g., because of a crash between DB insert and Redis enqueue).
 */
export async function recoverStaleDispatches(): Promise<number> {
  const stale = await prisma.dispatch.findMany({
    where: {
      status: { in: ["SCHEDULED", "RATE_LIMITED"] },
      scheduledAt: { lte: new Date() },
    },
    include: { campaign: true },
  });

  let recovered = 0;
  for (const d of stale) {
    const jobData: DispatchJobData = {
      dispatchId: d.id,
      campaignId: d.campaignId,
      senderId: d.senderId,
      recipientEmail: d.recipientEmail,
      recipientName: d.recipientName ?? undefined,
      subject: d.campaign.subjectTemplate,
      body: d.campaign.bodyTemplate,
      idempotencyKey: d.idempotencyKey,
    };

    await dispatchQueue.add("send-email", jobData, {
      jobId: d.id,
      delay: 0, // send immediately — already overdue
    });

    await prisma.dispatch.update({
      where: { id: d.id },
      data: { status: "QUEUED" },
    });

    recovered++;
  }

  if (recovered > 0) {
    logger.warn({ recovered }, "Recovered stale dispatches on startup");
  }

  return recovered;
}

// ─── Helpers ────────────────────────────────────────────

function buildIdempotencyKey(
  campaignId: string,
  email: string,
  scheduledAt: string
): string {
  const raw = `${campaignId}:${email.toLowerCase()}:${scheduledAt}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 48);
}
