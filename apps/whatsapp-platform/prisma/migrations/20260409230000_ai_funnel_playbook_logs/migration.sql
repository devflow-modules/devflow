-- Funil comercial: playbook editável + snapshot de estado nos logs
ALTER TABLE "ai_agent_configs" ADD COLUMN IF NOT EXISTS "playbook_json" JSONB;
ALTER TABLE "ai_message_logs" ADD COLUMN IF NOT EXISTS "ai_state_snapshot" VARCHAR(32);
