import type { AiAgentConfig } from "@/generated/prisma-whatsapp";
import type { AiConfigApiResponse } from "./aiConfigTypes";
import { parsePlaybookJson } from "@/modules/ai/conversationStateService";
import { resolveEffectiveDriver } from "./resolveAiRuntimeConfig";

export function aiAgentConfigToApiResponse(
  row: AiAgentConfig,
  tenantAiDriver: string | null
): AiConfigApiResponse {
  const effectiveDriver = resolveEffectiveDriver(tenantAiDriver, row.runtimeDriver) ?? "ruleBased";
  return {
    enabled: row.enabled,
    driver: row.runtimeDriver,
    tenantAiDriver,
    effectiveDriver,
    model: row.model ?? "gpt-4o-mini",
    maxTokens: row.maxTokens,
    temperature: row.temperature,
    fallbackToHuman: row.fallbackToHuman,
    systemPrompt: row.systemPrompt,
    assistantName: row.assistantName,
    businessContext: row.businessContext,
    goal: row.goal,
    tone: row.tone,
    rules: row.rules ?? [],
    forbiddenTopics: row.forbiddenTopics ?? [],
    handoffTriggers: row.handoffTriggers ?? [],
    autoReply: row.autoReply,
    outOfHoursReply: row.outOfHoursReply,
    playbookJson: parsePlaybookJson(row.playbookJson) ?? null,
    configVersion: row.configVersion,
    updatedAt: row.updatedAt.toISOString(),
    updatedByUserId: row.updatedByUserId,
  };
}
