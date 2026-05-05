import type { AiAgentConfig } from "@/generated/prisma-whatsapp";
import {
  agentPromptInputFromConfig,
  type AgentPromptInput,
} from "@/modules/ai/prompt/agentSystemPrompt";

/**
 * Herança: override por canal só quando definido; caso contrário usa o tenant (`AiAgentConfig.auto_reply`).
 */
export function resolveEffectiveAutoReply(
  tenantAutoReply: boolean,
  channelOverride: boolean | null | undefined
): boolean {
  if (channelOverride === null || channelOverride === undefined) {
    return tenantAutoReply;
  }
  return channelOverride;
}

/**
 * Junta o perfil/canal extra à configuração do agente: o texto do canal entra como prefixo de `businessContext`
 * (quando vazio, o override sozinho satisfaz `hasEffectiveAgentPrompt` se ainda não houver campos no tenant).
 */
export function agentPromptInputFromConfigAndChannel(
  config: AiAgentConfig,
  channelProfileOverride: string | null | undefined
): AgentPromptInput {
  const base = agentPromptInputFromConfig(config);
  const extra = channelProfileOverride?.trim();
  if (!extra) return base;
  const existing = base.businessContext?.trim();
  const mergedCtx = existing ? `${extra}\n\n---\n\n${existing}` : extra;
  return { ...base, businessContext: mergedCtx };
}
