-- Claim atómico para resposta automática (concorrência entre workers).

CREATE TYPE "WaAutoReplyClaimTrigger" AS ENUM ('LEGACY', 'AI', 'AUTOMATION');

CREATE TYPE "WaAutoReplyClaimStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'EXPIRED');

CREATE TABLE "wa_auto_reply_claims" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "wa_inbox_thread_id" TEXT NOT NULL,
    "inbound_wa_message_id" VARCHAR(128) NOT NULL,
    "trigger_source" "WaAutoReplyClaimTrigger" NOT NULL,
    "status" "WaAutoReplyClaimStatus" NOT NULL DEFAULT 'PENDING',
    "claim_token" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "outbound_wa_message_id" VARCHAR(128),
    "failure_reason" VARCHAR(256),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wa_auto_reply_claims_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "wa_auto_reply_claims_tenant_id_wa_inbox_thread_id_inbound_wa_message_id_trigger_source_key" ON "wa_auto_reply_claims"("tenant_id", "wa_inbox_thread_id", "inbound_wa_message_id", "trigger_source");

CREATE INDEX "wa_auto_reply_claims_tenant_id_wa_inbox_thread_id_idx" ON "wa_auto_reply_claims"("tenant_id", "wa_inbox_thread_id");

ALTER TABLE "wa_auto_reply_claims" ADD CONSTRAINT "wa_auto_reply_claims_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wa_auto_reply_claims" ADD CONSTRAINT "wa_auto_reply_claims_wa_inbox_thread_id_fkey" FOREIGN KEY ("wa_inbox_thread_id") REFERENCES "wa_inbox_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
