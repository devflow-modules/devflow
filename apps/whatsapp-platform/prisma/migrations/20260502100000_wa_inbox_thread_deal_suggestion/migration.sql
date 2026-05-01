-- v1.1: motivo de perda, sugestão de fecho (operador) e payload da proposta para confirmação do manager.
ALTER TABLE "wa_inbox_threads" ADD COLUMN "deal_lost_reason" VARCHAR(32);
ALTER TABLE "wa_inbox_threads" ADD COLUMN "deal_suggested" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "wa_inbox_threads" ADD COLUMN "deal_suggested_at" TIMESTAMP(3);
ALTER TABLE "wa_inbox_threads" ADD COLUMN "deal_suggested_by" VARCHAR(128);
ALTER TABLE "wa_inbox_threads" ADD COLUMN "deal_suggested_status" VARCHAR(16);
ALTER TABLE "wa_inbox_threads" ADD COLUMN "deal_suggested_value" DOUBLE PRECISION;
ALTER TABLE "wa_inbox_threads" ADD COLUMN "deal_suggested_lost_reason" VARCHAR(32);
