-- Additive Client 1 readiness: user lifecycle + automatic distribution config.
-- Non-destructive. Existing users remain active via DEFAULT.

ALTER TABLE "tenant_operational_configs"
  ADD COLUMN IF NOT EXISTS "automatic_distribution_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "routing_round_robin_cursor" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "wa_inbox_queues"
  ADD COLUMN IF NOT EXISTS "routing_round_robin_cursor" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "whatsapp_users"
  ADD COLUMN IF NOT EXISTS "status" VARCHAR(32) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "activation_token_hash" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "activation_expires_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "whatsapp_users_tenant_id_status_idx"
  ON "whatsapp_users"("tenant_id", "status");
