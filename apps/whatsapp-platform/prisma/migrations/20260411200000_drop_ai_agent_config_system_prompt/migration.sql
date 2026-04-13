-- Remove prompt livre legado de AiAgentConfig; comportamento só via campos estruturados + presets.
ALTER TABLE "ai_agent_configs" DROP COLUMN IF EXISTS "system_prompt";
