-- Additive: Stripe webhook processing state machine + orphan Meta status buffer.
-- Non-destructive: existing stripe_webhook_events rows backfilled as PROCESSED.

ALTER TABLE "stripe_webhook_events" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32) NOT NULL DEFAULT 'PROCESSED';
ALTER TABLE "stripe_webhook_events" ADD COLUMN IF NOT EXISTS "attempt_count" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "stripe_webhook_events" ADD COLUMN IF NOT EXISTS "last_error" VARCHAR(2000);
ALTER TABLE "stripe_webhook_events" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "stripe_webhook_events" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- processed_at was NOT NULL; allow null for in-flight / failed
ALTER TABLE "stripe_webhook_events" ALTER COLUMN "processed_at" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "stripe_webhook_events_status_updated_at_idx" ON "stripe_webhook_events"("status", "updated_at");

CREATE TABLE IF NOT EXISTS "wa_inbox_pending_statuses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "wa_message_id" TEXT NOT NULL,
    "meta_status" VARCHAR(64) NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wa_inbox_pending_statuses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "wa_inbox_pending_statuses_tenant_id_wa_message_id_meta_status_key"
  ON "wa_inbox_pending_statuses"("tenant_id", "wa_message_id", "meta_status");

CREATE INDEX IF NOT EXISTS "wa_inbox_pending_statuses_tenant_id_wa_message_id_idx"
  ON "wa_inbox_pending_statuses"("tenant_id", "wa_message_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wa_inbox_pending_statuses_tenant_id_fkey'
  ) THEN
    ALTER TABLE "wa_inbox_pending_statuses"
      ADD CONSTRAINT "wa_inbox_pending_statuses_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
