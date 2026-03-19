-- Metered billing: Stripe usage reporting + invoice snapshot

ALTER TABLE "usage_events" ADD COLUMN "reported_to_stripe_at" TIMESTAMP(3),
ADD COLUMN "stripe_report_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "stripe_report_last_error" VARCHAR(2000);

CREATE INDEX "usage_events_tenant_id_reported_to_stripe_at_idx" ON "usage_events"("tenant_id", "reported_to_stripe_at");

ALTER TABLE "billing_subscriptions" ADD COLUMN "stripe_message_price_id" TEXT,
ADD COLUMN "stripe_ai_price_id" TEXT,
ADD COLUMN "stripe_subscription_item_msg_id" TEXT,
ADD COLUMN "stripe_subscription_item_ai_id" TEXT,
ADD COLUMN "last_invoice_id" TEXT,
ADD COLUMN "last_invoice_status" VARCHAR(64),
ADD COLUMN "last_invoice_amount_paid" INTEGER;
