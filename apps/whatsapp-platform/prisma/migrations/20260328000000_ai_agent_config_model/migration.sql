-- Add model column to ai_agent_configs for per-tenant model override
ALTER TABLE "ai_agent_configs" ADD COLUMN "model" VARCHAR(128) DEFAULT 'gpt-4o-mini';
