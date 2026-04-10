-- Estado playbook por thread + observabilidade em ai_message_logs

ALTER TABLE "wa_inbox_threads" ADD COLUMN IF NOT EXISTS "ai_state" VARCHAR(32);

ALTER TABLE "ai_message_logs" ADD COLUMN IF NOT EXISTS "event_kind" VARCHAR(32) NOT NULL DEFAULT 'auto_reply';
ALTER TABLE "ai_message_logs" ADD COLUMN IF NOT EXISTS "decision_reason" VARCHAR(512);
ALTER TABLE "ai_message_logs" ADD COLUMN IF NOT EXISTS "model_used" VARCHAR(128);
ALTER TABLE "ai_message_logs" ADD COLUMN IF NOT EXISTS "provider_kind" VARCHAR(32);

CREATE INDEX IF NOT EXISTS "ai_message_logs_tenant_id_event_kind_idx" ON "ai_message_logs"("tenant_id", "event_kind");
