import type { AiAgentTone } from "@/generated/prisma-whatsapp";
import type { PlaybookJson } from "@/modules/ai/conversationStateService";

/** Camada de produto — o que o gestor edita na UI (sem segredos). */
export interface AiBehaviorConfig {
  assistantName: string | null;
  businessContext: string | null;
  goal: string | null;
  tone: AiAgentTone;
  rules: string[];
  forbiddenTopics: string[];
  handoffTriggers: string[];
  autoReply: boolean;
  outOfHoursReply: string | null;
  /** Objetivos e regras por estágio do funil (override opcional) */
  playbookJson: PlaybookJson | null;
}

/** Runtime técnico persistido por tenant (chaves ficam sempre no servidor). */
export interface AiRuntimeConfigPersisted {
  enabled: boolean;
  /** Override em `AiAgentConfig`; null = herdar Tenant.ai_driver */
  driver: string | null;
  /** Driver efetivo após merge com tenant (só leitura na API). */
  effectiveDriver: string;
  model: string | null;
  maxTokens: number;
  temperature: number;
  fallbackToHuman: boolean;
}

/** Resposta da API GET /api/ai/config — visão completa para a tela. */
export interface AiConfigApiResponse extends AiBehaviorConfig, AiRuntimeConfigPersisted {
  configVersion: number;
  updatedAt: string;
  updatedByUserId: string | null;
  /** Motor definido em Configurações gerais do tenant (contexto para override). */
  tenantAiDriver: string | null;
}

/** Config efetiva para execução (LLM) após merge env + tenant. */
export interface AiRuntimeExecution {
  driver: string;
  providerKind: "openai" | "anthropic" | null;
  model: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
}
