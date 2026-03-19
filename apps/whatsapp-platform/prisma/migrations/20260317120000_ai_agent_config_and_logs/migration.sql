-- AI automation: per-tenant agent config + message logs

CREATE TYPE "AiAgentTone" AS ENUM ('FRIENDLY', 'SALES', 'SUPPORT', 'NEUTRAL');

CREATE TABLE "ai_agent_configs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "system_prompt" TEXT NOT NULL DEFAULT '',
    "tone" "AiAgentTone" NOT NULL DEFAULT 'NEUTRAL',
    "max_tokens" INTEGER NOT NULL DEFAULT 512,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "fallback_to_human" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_agent_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_agent_configs_tenant_id_key" ON "ai_agent_configs"("tenant_id");

ALTER TABLE "ai_agent_configs" ADD CONSTRAINT "ai_agent_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ai_message_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "wa_inbox_thread_id" TEXT,
    "inbound_wa_message_id" TEXT,
    "outbound_wa_message_id" TEXT,
    "prompt_used" TEXT NOT NULL,
    "response_generated" TEXT NOT NULL,
    "tokens_used" INTEGER,
    "duration_ms" INTEGER,
    "error_message" VARCHAR(2000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_message_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_message_logs_tenant_id_created_at_idx" ON "ai_message_logs"("tenant_id", "created_at" DESC);
CREATE INDEX "ai_message_logs_inbound_wa_message_id_idx" ON "ai_message_logs"("inbound_wa_message_id");

ALTER TABLE "ai_message_logs" ADD CONSTRAINT "ai_message_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
