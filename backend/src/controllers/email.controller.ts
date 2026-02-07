import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { scheduleEmailBatch } from "../services/scheduler.service";
import { peekRemaining } from "../queue/rateLimiter";
import { logger } from "../config/logger";

// ─── Validation Schemas ─────────────────────────────────

export const scheduleSchema = z.object({
  campaignTitle: z.string().min(1).max(255),
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
  scheduledAt: z
    .string()
    .datetime()
    .refine(
      (val) => new Date(val).getTime() > Date.now() + 60_000,
      "scheduledAt must be at least 1 minute in the future"
    ),
  recipients: z
    .array(
      z.object({
        email: z.string().email(),
        name: z.string().max(255).optional(),
      })
    )
    .min(1)
    .max(1000),
});

// ─── POST /api/emails/schedule ──────────────────────────

export async function scheduleEmails(
  req: Request,
  res: Response
): Promise<void> {
  const senderId: string = (req as any).user.sub;
  const payload = req.body; // already validated by middleware

  try {
    const { campaign, dispatches } = await scheduleEmailBatch(
      senderId,
      payload
    );

    res.status(201).json({
      campaignId: campaign.id,
      totalDispatches: dispatches.length,
      dispatches: dispatches.map((d: any) => ({
        id: d.id,
        recipientEmail: d.recipientEmail,
        status: d.status,
        scheduledAt: d.scheduledAt,
      })),
    });
  } catch (err) {
    logger.error({ err, senderId }, "Failed to schedule email batch");
    res.status(500).json({ message: "Scheduling failed" });
  }
}

// ─── GET /api/emails/scheduled ──────────────────────────

export async function listScheduled(
  req: Request,
  res: Response
): Promise<void> {
  const senderId: string = (req as any).user.sub;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const perPage = Math.min(100, parseInt(req.query.perPage as string) || 20);
  const skip = (page - 1) * perPage;

  const where = {
    senderId,
    status: {
      in: ["SCHEDULED", "QUEUED", "PROCESSING", "RATE_LIMITED"] as any[],
    },
  };

  const [data, total] = await Promise.all([
    prisma.dispatch.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
      skip,
      take: perPage,
      select: {
        id: true,
        recipientEmail: true,
        recipientName: true,
        status: true,
        scheduledAt: true,
        attempts: true,
        campaign: { select: { title: true, subjectTemplate: true } },
      },
    }),
    prisma.dispatch.count({ where }),
  ]);

  res.json({
    data,
    meta: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
  });
}

// ─── GET /api/emails/sent ───────────────────────────────

export async function listSent(req: Request, res: Response): Promise<void> {
  const senderId: string = (req as any).user.sub;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const perPage = Math.min(100, parseInt(req.query.perPage as string) || 20);
  const skip = (page - 1) * perPage;

  const where = { senderId, status: "SENT" as const };

  const [data, total] = await Promise.all([
    prisma.dispatch.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: perPage,
      select: {
        id: true,
        recipientEmail: true,
        recipientName: true,
        scheduledAt: true,
        updatedAt: true,
        campaign: { select: { title: true, subjectTemplate: true } },
        ledger: {
          select: { smtpMessageId: true, sentAt: true, outcome: true },
        },
      },
    }),
    prisma.dispatch.count({ where }),
  ]);

  res.json({
    data,
    meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  });
}

// ─── PATCH /api/emails/:id/cancel ───────────────────────

export async function cancelDispatch(
  req: Request,
  res: Response
): Promise<void> {
  const senderId: string = (req as any).user.sub;
  const dispatchId: string = req.params.id;

  const dispatch = await prisma.dispatch.findFirst({
    where: { id: dispatchId, senderId },
  });

  if (!dispatch) {
    res.status(404).json({ message: "Dispatch not found" });
    return;
  }

  if (!["SCHEDULED", "QUEUED", "RATE_LIMITED"].includes(dispatch.status)) {
    res
      .status(409)
      .json({ message: `Cannot cancel a dispatch with status ${dispatch.status}` });
    return;
  }

  await prisma.dispatch.update({
    where: { id: dispatchId },
    data: { status: "CANCELLED" },
  });

  // Best-effort: remove from BullMQ (may already be processing)
  const { dispatchQueue } = await import("../queue/dispatchQueue");
  const job = await dispatchQueue.getJob(dispatchId);
  if (job) await job.remove().catch(() => {});

  res.json({ id: dispatchId, status: "CANCELLED" });
}

// ─── GET /api/emails/rate-limit ─────────────────────────

export async function getRateLimitStatus(
  req: Request,
  res: Response
): Promise<void> {
  const senderId: string = (req as any).user.sub;
  const remaining = await peekRemaining(senderId);
  res.json({ remaining, limit: parseInt(process.env.MAX_EMAILS_PER_HOUR ?? "50") });
}
