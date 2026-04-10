-- Lead CRM leve: score, dados extraídos, snapshot em logs de IA
ALTER TABLE "wa_inbox_threads" ADD COLUMN "lead_score" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "wa_inbox_threads" ADD COLUMN "lead_data" JSONB;

CREATE INDEX "wa_inbox_threads_tenant_id_lead_score_idx" ON "wa_inbox_threads"("tenant_id", "lead_score" DESC);

ALTER TABLE "ai_message_logs" ADD COLUMN "lead_score_snapshot" INTEGER;
