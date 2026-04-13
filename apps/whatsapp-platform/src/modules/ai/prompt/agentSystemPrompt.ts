import type { AiAgentConfig, AiAgentTone } from "@/generated/prisma-whatsapp";
import {
  getPlaybookInstruction,
  type PlaybookJson,
} from "@/modules/ai/conversationStateService";

const TONE_LINES: Record<AiAgentTone, string> = {
  FRIENDLY: "Tom: amigável, caloroso e próximo.",
  SALES: "Tom: comercial — objetivo, valor e próximo passo sem ser agressivo.",
  SUPPORT: "Tom: suporte — claro, didático, passo a passo quando fizer sentido.",
  NEUTRAL: "Tom: neutro e profissional.",
};

const WHATSAPP_FOOTER =
  "Responde em português do Brasil. Mensagens curtas, adequadas ao WhatsApp (poucos parágrafos).";

export type AgentPromptInput = {
  tone: AiAgentTone;
  assistantName?: string | null;
  businessContext?: string | null;
  goal?: string | null;
  rules: string[];
  forbiddenTopics: string[];
  handoffTriggers: string[];
};

export function hasStructuredBehavior(input: AgentPromptInput): boolean {
  const t = (s: string | null | undefined) => (s?.trim() ?? "").length > 0;
  return (
    t(input.assistantName) ||
    t(input.businessContext) ||
    t(input.goal) ||
    (input.rules?.length ?? 0) > 0 ||
    (input.forbiddenTopics?.length ?? 0) > 0 ||
    (input.handoffTriggers?.length ?? 0) > 0
  );
}

/** Indica se a automação pode gerar texto (comportamento estruturado preenchido). */
export function hasEffectiveAgentPrompt(input: AgentPromptInput): boolean {
  return hasStructuredBehavior(input);
}

export type AgentPromptBuildOptions = {
  conversationState?: string;
  recentSummary?: string;
  playbookOverlay?: PlaybookJson | null;
  promptAugmentation?: string | null;
};

function playbookPromptBlock(opts: AgentPromptBuildOptions): string {
  if (!opts.conversationState) return "";
  const core = getPlaybookInstruction(opts.conversationState, opts.playbookOverlay ?? undefined);
  const aug = opts.promptAugmentation?.trim();
  return aug ? `${core}\n\n${aug}` : core;
}

function appendPlaybookSections(base: string, opts: AgentPromptBuildOptions | undefined): string {
  if (!opts?.conversationState && !opts?.recentSummary?.trim()) return base;
  const extra: string[] = [];
  if (opts.conversationState) {
    extra.push(`Estado da conversa (funil): ${opts.conversationState}.\n${playbookPromptBlock(opts)}`);
  }
  if (opts.recentSummary?.trim()) {
    extra.push("Resumo das últimas mensagens (contexto):\n" + opts.recentSummary.trim());
  }
  return [base, ...extra].filter(Boolean).join("\n\n");
}

/** Rede de segurança se não houver campos estruturados (a API não deve permitir IA ativa neste estado). */
function minimalPromptFromTone(tone: AiAgentTone): string {
  return [TONE_LINES[tone] ?? TONE_LINES.NEUTRAL, WHATSAPP_FOOTER].join("\n\n");
}

/**
 * Único ponto de montagem do system prompt para runtime e simulação.
 * Usa apenas a configuração estruturada; sem legado em texto livre.
 */
export function buildAgentSystemPrompt(
  input: AgentPromptInput,
  opts?: AgentPromptBuildOptions
): string {
  if (!hasStructuredBehavior(input)) {
    return appendPlaybookSections(minimalPromptFromTone(input.tone), opts);
  }

  const parts: string[] = [];

  const name = input.assistantName?.trim();
  if (name) {
    parts.push(`O teu nome de apresentação para o cliente é: ${name}.`);
  }

  parts.push(TONE_LINES[input.tone] ?? TONE_LINES.NEUTRAL);

  const ctx = input.businessContext?.trim();
  if (ctx) {
    parts.push("Contexto do negócio:\n" + ctx);
  }

  const goal = input.goal?.trim();
  if (goal) {
    parts.push("Objetivo principal nesta conversa:\n" + goal);
  }

  const rules = (input.rules ?? []).map((r) => r.trim()).filter(Boolean);
  if (rules.length > 0) {
    parts.push("Regras obrigatórias:\n" + rules.map((r, i) => `${i + 1}. ${r}`).join("\n"));
  }

  const forbidden = (input.forbiddenTopics ?? []).map((r) => r.trim()).filter(Boolean);
  if (forbidden.length > 0) {
    parts.push(
      "Nunca abordes ou aprofundes estes tópicos (recusa educada e redireciona):\n" +
        forbidden.map((r, i) => `${i + 1}. ${r}`).join("\n")
    );
  }

  const handoff = (input.handoffTriggers ?? []).map((r) => r.trim()).filter(Boolean);
  if (handoff.length > 0) {
    parts.push(
      "Sempre que ocorrer uma destas situações, indica claramente que um humano vai assumir (handoff), sem inventar detalhes internos:\n" +
        handoff.map((r, i) => `${i + 1}. ${r}`).join("\n")
    );
  }

  if (opts?.conversationState) {
    parts.push(`Estado da conversa (funil): ${opts.conversationState}.\n${playbookPromptBlock(opts)}`);
  }
  if (opts?.recentSummary?.trim()) {
    parts.push("Resumo das últimas mensagens (contexto):\n" + opts.recentSummary.trim());
  }

  parts.push(WHATSAPP_FOOTER);

  return parts.filter(Boolean).join("\n\n");
}

export function agentPromptInputFromConfig(row: AiAgentConfig): AgentPromptInput {
  return {
    tone: row.tone,
    assistantName: row.assistantName,
    businessContext: row.businessContext,
    goal: row.goal,
    rules: row.rules ?? [],
    forbiddenTopics: row.forbiddenTopics ?? [],
    handoffTriggers: row.handoffTriggers ?? [],
  };
}
