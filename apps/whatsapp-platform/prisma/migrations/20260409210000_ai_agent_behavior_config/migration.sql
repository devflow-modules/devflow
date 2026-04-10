-- Comportamento do agente + auditoria + tipos de uso para observabilidade

ALTER TYPE "AiUsageLogType" ADD VALUE 'AI_TEST_RUN';
ALTER TYPE "AiUsageLogType" ADD VALUE 'AI_PROVIDER_ERROR';

ALTER TABLE "ai_agent_configs" ADD COLUMN IF NOT EXISTS "assistant_name" VARCHAR(120);
ALTER TABLE "ai_agent_configs" ADD COLUMN IF NOT EXISTS "business_context" TEXT;
ALTER TABLE "ai_agent_configs" ADD COLUMN IF NOT EXISTS "goal" TEXT;
ALTER TABLE "ai_agent_configs" ADD COLUMN IF NOT EXISTS "rules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ai_agent_configs" ADD COLUMN IF NOT EXISTS "forbidden_topics" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ai_agent_configs" ADD COLUMN IF NOT EXISTS "handoff_triggers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ai_agent_configs" ADD COLUMN IF NOT EXISTS "auto_reply" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ai_agent_configs" ADD COLUMN IF NOT EXISTS "out_of_hours_reply" TEXT;
ALTER TABLE "ai_agent_configs" ADD COLUMN IF NOT EXISTS "runtime_driver" VARCHAR(32);
ALTER TABLE "ai_agent_configs" ADD COLUMN IF NOT EXISTS "config_version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ai_agent_configs" ADD COLUMN IF NOT EXISTS "updated_by_user_id" VARCHAR(128);
