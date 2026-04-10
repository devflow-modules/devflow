import { prisma } from "@/lib/prisma";
import { WaInboxDirection, WaInboxMsgType } from "@/generated/prisma-whatsapp";

/** Estados do funil comercial (playbook). */
export type AiState = "lead" | "qualifying" | "negotiating" | "support" | "closed";

/** @deprecated usar AiState — mantido para compat com imports existentes */
export type AiPlaybookState = AiState;

export type PlaybookStage = {
  goal: string;
  actions: string[];
};

export const DEFAULT_PLAYBOOK: Record<AiState, PlaybookStage> = {
  lead: {
    goal: "iniciar conversa e gerar interesse",
    actions: ["saudar", "perguntar necessidade"],
  },
  qualifying: {
    goal: "entender necessidade",
    actions: ["fazer perguntas", "identificar dor"],
  },
  negotiating: {
    goal: "fechar venda",
    actions: ["oferecer solução", "criar urgência moderada"],
  },
  support: {
    goal: "resolver problema",
    actions: ["ajudar", "encaminhar humano se necessário"],
  },
  closed: {
    goal: "encerrar com clareza ou reabrir com cortesia",
    actions: ["confirmar próximos passos", "agradecer"],
  },
};

/** Overrides opcionais persistidos em AiAgentConfig.playbookJson */
export type PlaybookJson = Partial<
  Record<
    AiState,
    {
      goal?: string;
      rules?: string[];
    }
  >
>;

const SUPPORT_HINTS = [
  "problema",
  "erro",
  "não funciona",
  "nao funciona",
  "suporte",
  "defeito",
  "bug",
  "reclamação",
  "reclamacao",
] as const;

const INTEREST_KEYWORDS = [
  "preço",
  "preco",
  "orçamento",
  "orcamento",
  "contratar",
  "comprar",
  "proposta",
  "quero fechar",
  "fechar pacote",
  "valor",
  "desconto",
] as const;

const CLOSING_KEYWORDS = [
  "combinado",
  "aceito",
  "pode fechar",
  "vou fechar",
  "fechamos",
  "fecho sim",
  "ok pode ser",
  "pode ser então",
  "fechado",
] as const;

function normalizeLegacyState(raw: string | null | undefined): AiState {
  if (!raw?.trim()) return "lead";
  const s = raw.trim();
  const allowed: AiState[] = ["lead", "qualifying", "negotiating", "support", "closed"];
  if (allowed.includes(s as AiState)) return s as AiState;
  return "lead";
}

/**
 * Motor de transição do funil (próximo estado a partir do contexto actual).
 */
export function resolveNextState(params: {
  previousState: string | null | undefined;
  inboundTextCount: number;
  lastInboundText: string;
}): AiState {
  const prev = normalizeLegacyState(params.previousState);
  const text = params.lastInboundText.toLowerCase();
  const n = params.inboundTextCount;

  const hasProblem = SUPPORT_HINTS.some((h) => text.includes(h));
  const hasInterest = INTEREST_KEYWORDS.some((k) => text.includes(k));
  const hasClosing = CLOSING_KEYWORDS.some((k) => text.includes(k));

  if (prev === "closed") return "closed";

  if (hasProblem) return "support";

  if (prev === "negotiating" && hasClosing) return "closed";

  if (prev === "qualifying" && hasInterest) return "negotiating";

  if (prev === "lead" && n >= 2) return "qualifying";

  if (prev === "negotiating") return "negotiating";

  if (prev === "qualifying") return "qualifying";

  if (prev === "support") return "support";

  return "lead";
}

/** @deprecated usar resolveNextState — alias para compatibilidade */
export function resolveConversationState(params: {
  previousState: string | null | undefined;
  inboundTextCount: number;
  lastInboundText: string;
}): AiState {
  return resolveNextState(params);
}

function mergedStage(state: AiState, custom: PlaybookJson | null | undefined): PlaybookStage {
  const base = DEFAULT_PLAYBOOK[state];
  const o = custom?.[state];
  const goal = (o?.goal?.trim() || base.goal).trim();
  const actions =
    o?.rules && o.rules.length > 0
      ? o.rules.map((r) => r.trim()).filter(Boolean)
      : [...base.actions];
  return { goal, actions };
}

/**
 * Texto injectado no system prompt a partir do estágio e overrides do tenant.
 */
export function getPlaybookInstruction(
  aiState: AiState | string | null | undefined,
  custom?: PlaybookJson | null
): string {
  const s = normalizeLegacyState(aiState ?? undefined);
  const stage = mergedStage(s, custom ?? undefined);
  const actionsLine = stage.actions.map((a, i) => `${i + 1}. ${a}`).join("\n");
  return [
    `Objetivo neste estágio (${s}): ${stage.goal}.`,
    `Acções sugeridas:\n${actionsLine}`,
  ].join("\n");
}

/** @deprecated usar getPlaybookInstruction */
export function getStateInstruction(
  aiState: AiState | string | null | undefined,
  custom?: PlaybookJson | null
): string {
  return getPlaybookInstruction(aiState, custom);
}

export function parsePlaybookJson(raw: unknown): PlaybookJson | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const out: PlaybookJson = {};
  const states: AiState[] = ["lead", "qualifying", "negotiating", "support", "closed"];
  for (const k of states) {
    const v = o[k];
    if (!v || typeof v !== "object") continue;
    const g = v as { goal?: unknown; rules?: unknown };
    const goal = typeof g.goal === "string" ? g.goal.slice(0, 500) : undefined;
    let rules: string[] | undefined;
    if (Array.isArray(g.rules)) {
      rules = g.rules
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim().slice(0, 300))
        .filter(Boolean)
        .slice(0, 20);
    }
    if (goal || (rules && rules.length)) out[k] = { ...(goal ? { goal } : {}), ...(rules?.length ? { rules } : {}) };
  }
  return Object.keys(out).length ? out : null;
}

export function buildRecentMessagesSummary(
  messages: { role: "user" | "assistant"; content: string }[],
  take = 3
): string {
  const last = messages.slice(-take);
  if (last.length === 0) return "";
  return last
    .map((m) => `${m.role === "user" ? "Cliente" : "Assistente"}: ${m.content.slice(0, 500)}`)
    .join("\n");
}

export async function countInboundTextMessages(tenantId: string, threadId: string): Promise<number> {
  return prisma.waInboxMessage.count({
    where: {
      tenantId,
      threadId,
      direction: WaInboxDirection.INBOUND,
      messageType: WaInboxMsgType.TEXT,
    },
  });
}

export async function persistThreadAiStateIfChanged(
  threadId: string,
  next: AiState,
  previous: string | null | undefined
): Promise<void> {
  if (previous === next) return;
  await prisma.waInboxThread.update({
    where: { id: threadId },
    data: { aiState: next },
  });
}
