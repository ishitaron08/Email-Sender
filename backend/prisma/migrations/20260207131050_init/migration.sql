-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'PAUSED');

-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('SCHEDULED', 'QUEUED', 'PROCESSING', 'SENT', 'FAILED', 'RATE_LIMITED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SendOutcome" AS ENUM ('DELIVERED', 'BOUNCED', 'ERROR');

-- CreateTable
CREATE TABLE "identities" (
    "id" UUID NOT NULL,
    "google_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "subject_template" TEXT NOT NULL,
    "body_template" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatches" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "recipient_email" VARCHAR(320) NOT NULL,
    "recipient_name" VARCHAR(255),
    "idempotency_key" VARCHAR(255) NOT NULL,
    "status" "DispatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "attempts" SMALLINT NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL,
    "dispatch_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "smtp_message_id" VARCHAR(255),
    "outcome" "SendOutcome" NOT NULL DEFAULT 'DELIVERED',
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw_response" JSONB,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "identities_google_id_key" ON "identities"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "identities_email_key" ON "identities"("email");

-- CreateIndex
CREATE INDEX "campaigns_owner_id_status_idx" ON "campaigns"("owner_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "dispatches_idempotency_key_key" ON "dispatches"("idempotency_key");

-- CreateIndex
CREATE INDEX "dispatches_status_scheduled_at_idx" ON "dispatches"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "dispatches_campaign_id_status_idx" ON "dispatches"("campaign_id", "status");

-- CreateIndex
CREATE INDEX "dispatches_sender_id_scheduled_at_idx" ON "dispatches"("sender_id", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entries_dispatch_id_key" ON "ledger_entries"("dispatch_id");

-- CreateIndex
CREATE INDEX "ledger_entries_idempotency_key_idx" ON "ledger_entries"("idempotency_key");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_dispatch_id_fkey" FOREIGN KEY ("dispatch_id") REFERENCES "dispatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
