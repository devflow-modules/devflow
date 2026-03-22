-- Add quota counters to billing_subscriptions (meter events architecture)
-- messagesIncludedUsed, aiIncludedUsed: usage within included plan quota
-- messagesOverageSent, aiOverageSent: overage reported to Stripe meter events

ALTER TABLE "billing_subscriptions" ADD COLUMN "messages_included_used" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "billing_subscriptions" ADD COLUMN "ai_included_used" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "billing_subscriptions" ADD COLUMN "messages_overage_sent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "billing_subscriptions" ADD COLUMN "ai_overage_sent" INTEGER NOT NULL DEFAULT 0;

-- Webhook idempotency: prevent duplicate processing of Stripe events
CREATE TABLE "stripe_webhook_events" (
    "id" TEXT NOT NULL,
    "stripe_event_id" TEXT NOT NULL,
    "event_type" VARCHAR(128) NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stripe_webhook_events_stripe_event_id_key" ON "stripe_webhook_events"("stripe_event_id");
CREATE INDEX "stripe_webhook_events_stripe_event_id_idx" ON "stripe_webhook_events"("stripe_event_id");
