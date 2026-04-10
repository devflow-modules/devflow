import type { AiAgentConfig } from "@/generated/prisma-whatsapp";
import { WaInboxThreadStatus } from "@/generated/prisma-whatsapp";
import { generateReply } from "@/modules/ai/aiService";
import {
  agentPromptInputFromConfig,
  buildAgentSystemPrompt,
} from "@/modules/ai/prompt/agentSystemPrompt";
import { resolveAiRuntimeExecution, resolveEffectiveDriver } from "@/modules/ai/resolveAiRuntimeConfig";
import { isProviderConfigured, tenantDriverToProviderKind } from "@/modules/ai/aiProvider";
import { openAiConfig } from "@/modules/ai/openai";
import type { AiConfigPutInput } from "@/modules/ai/schemas/aiConfigSchemas";
import { normalizeAiConfigPartial } from "@/modules/ai/schemas/aiConfigSchemas";
import { shouldAiReply, type AiGuardDecision } from "@/modules/ai/aiGuard";
import {
  parsePlaybookJson,
  resolveConversationState,
  type AiPlaybookState,
} from "@/modules/ai/conversationStateService";

/** Merge seguro da linha atual com um draft parcial (simulação sem persistir). */
export function mergeAgentConfigDraft(
  base: AiAgentConfig,
  draft: Partial<AiConfigPutInput> | undefined
): AiAgentConfig {
  if (!draft || Object.keys(draft).length === 0) return base;
  const n = normalizeAiConfigPartial(draft);

  return {
    ...base,
    ...(n.enabled !== undefined ? { enabled: n.enabled } : {}),
    ...(n.systemPrompt !== undefined ? { systemPrompt: n.systemPrompt } : {}),
    ...(n.model !== undefined ? { model: n.model } : {}),
    ...(n.tone !== undefined ? { tone: n.tone } : {}),
    ...(n.maxTokens !== undefined ? { maxTokens: n.maxTokens } : {}),
    ...(n.temperature !== undefined ? { temperature: n.temperature } : {}),
    ...(n.fallbackToHuman !== undefined ? { fallbackToHuman: n.fallbackToHuman } : {}),
    ...(n.driver !== undefined ? { runtimeDriver: n.driver } : {}),
    ...(n.assistantName !== undefined ? { assistantName: n.assistantName } : {}),
    ...(n.businessContext !== undefined ? { businessContext: n.businessContext } : {}),
    ...(n.goal !== undefined ? { goal: n.goal } : {}),
    ...(n.rules !== undefined ? { rules: n.rules } : {}),
    ...(n.forbiddenTopics !== undefined ? { forbiddenTopics: n.forbiddenTopics } : {}),
    ...(n.handoffTriggers !== undefined ? { handoffTriggers: n.handoffTriggers } : {}),
    ...(n.autoReply !== undefined ? { autoReply: n.autoReply } : {}),
    ...(n.outOfHoursReply !== undefined ? { outOfHoursReply: n.outOfHoursReply } : {}),
    ...(n.playbookJson !== undefined ? { playbookJson: n.playbookJson as object } : {}),
  };
}

export interface AiTestSimulationResult {
  reply: string;
  usedDriver: string;
  usedModel: string;
  fallback: boolean;
  latencyMs: number;
  error?: string;
  decision: AiGuardDecision;
  playbookState: AiPlaybookState;
}

export async function runAiConfigTestSimulation(params: {
  tenantId: string;
  tenantAiDriver: string | null;
  config: AiAgentConfig;
  message: string;
}): Promise<AiTestSimulationResult> {
  const { tenantId, tenantAiDriver, config, message } = params;

  const effDriver = resolveEffectiveDriver(tenantAiDriver, config.runtimeDriver) ?? "ruleBased";

  const decision = shouldAiReply({
    messageText: message,
    config,
    thread: {
      id: "simulation",
      assignedToUserId: null,
      status: WaInboxThreadStatus.OPEN,
    },
  });

  const playbookState = resolveConversationState({
    previousState: null,
    inboundTextCount: 1,
    lastInboundText: message,
  });

  if (!decision.allow) {
    return {
      reply: "",
      usedDriver: effDriver,
      usedModel: config.model ?? openAiConfig.model,
      fallback: true,
      latencyMs: 0,
      error: decision.reason,
      decision,
      playbookState,
    };
  }

  const kind = tenantDriverToProviderKind(effDriver === "ruleBased" ? null : effDriver);
  if (!kind || !isProviderConfigured(kind)) {
    return {
      reply: "",
      usedDriver: effDriver,
      usedModel: config.model ?? openAiConfig.model,
      fallback: true,
      latencyMs: 0,
      error:
        effDriver === "ruleBased"
          ? "Selecione OpenAI ou Claude (motor de IA nas configurações ou override avançado) para testar."
          : "Chave do provedor não configurada no servidor.",
      decision,
      playbookState,
    };
  }

  const runtime = resolveAiRuntimeExecution({
    tenantAiDriver,
    configRuntimeDriver: config.runtimeDriver,
    model: config.model,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
  });

  const systemPrompt = buildAgentSystemPrompt(agentPromptInputFromConfig(config), {
    conversationState: playbookState,
    recentSummary: "",
    playbookOverlay: parsePlaybookJson(config.playbookJson),
  });

  const gen = await generateReply({
    tenantId,
    conversationId: "ai-simulation",
    messageText: message,
    contextMessages: [],
    systemPrompt,
    model: runtime.model,
    maxTokens: runtime.maxTokens,
    temperature: runtime.temperature,
    aiDriver: effDriver === "ruleBased" ? null : effDriver,
  });

  const fallback = Boolean(gen.error || !gen.text?.trim());

  return {
    reply: gen.text?.trim() ?? "",
    usedDriver: effDriver,
    usedModel: runtime.model,
    fallback,
    latencyMs: gen.durationMs ?? 0,
    error: gen.error,
    decision,
    playbookState,
  };
}
