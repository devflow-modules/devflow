-- Fecho comercial por thread (receita operacional WhatsApp).
ALTER TABLE "wa_inbox_threads" ADD COLUMN "deal_status" VARCHAR(16);
ALTER TABLE "wa_inbox_threads" ADD COLUMN "deal_value" DOUBLE PRECISION;
ALTER TABLE "wa_inbox_threads" ADD COLUMN "deal_currency" VARCHAR(8) NOT NULL DEFAULT 'BRL';
ALTER TABLE "wa_inbox_threads" ADD COLUMN "deal_closed_at" TIMESTAMP(3);

CREATE INDEX "wa_inbox_threads_tenant_id_deal_status_idx" ON "wa_inbox_threads" ("tenant_id", "deal_status");
