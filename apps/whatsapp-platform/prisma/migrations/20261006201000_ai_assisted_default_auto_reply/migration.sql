-- Client 1: assisted AI default for new AiAgentConfig rows (existing rows unchanged).
ALTER TABLE "ai_agent_configs"
  ALTER COLUMN "auto_reply" SET DEFAULT false;
