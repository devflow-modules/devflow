import { DEMO_SCENARIOS, isHandoffIntent } from "./scenarios";
import type { DemoOpsState, DemoReply, DemoScenarioId } from "./types";

const INITIAL_OPS: Record<DemoScenarioId, DemoOpsState> = {
  restaurante: {
    threadPreview: "Nenhuma conversa ativa — escolha um cenário.",
    status: "nova",
    queueHint: "Fila vazia",
  },
  tabacaria: {
    threadPreview: "Nenhuma conversa ativa — escolha um cenário.",
    status: "nova",
    queueHint: "Fila vazia",
  },
  loja: {
    threadPreview: "Nenhuma conversa ativa — escolha um cenário.",
    status: "nova",
    queueHint: "Fila vazia",
  },
};

export function getInitialOpsState(scenario: DemoScenarioId): DemoOpsState {
  return { ...INITIAL_OPS[scenario] };
}

/**
 * Primeira mensagem do bot após seleção do cenário (sem input do usuário).
 */
export function getScenarioIntro(scenario: DemoScenarioId): string {
  return DEMO_SCENARIOS[scenario].intro;
}

/**
 * Atualiza painel operacional após mensagem do cliente (antes da resposta do bot).
 */
export function buildOpsAfterUserMessage(
  scenario: DemoScenarioId,
  userText: string,
  previous: DemoOpsState
): DemoOpsState {
  const preview =
    userText.length > 72 ? `${userText.slice(0, 72)}…` : userText || previous.threadPreview;
  return {
    ...previous,
    threadPreview: preview,
    lastClientMessage: userText,
    status: previous.status === "nova" ? "bot_ativo" : previous.status,
    queueHint: previous.status === "nova" ? "Bot respondendo — SLA em segundos" : previous.queueHint,
  };
}

/**
 * Resolve resposta do bot e opcionalmente handoff + patch do painel operacional.
 */
export function resolveDemoUserMessage(
  scenario: DemoScenarioId,
  userText: string,
  opsBeforeReply: DemoOpsState
): DemoReply {
  const def = DEMO_SCENARIOS[scenario];
  const normalized = userText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (isHandoffIntent(userText)) {
    return {
      botText:
        "Handoff humano ativado.\n\nNa operação real esta conversa sai do bot, aparece na fila / inbox com contexto completo, e um agente assume com histórico e tags de triagem.\n\nO cliente vê algo como: “Estamos te conectando com alguém da equipe.”",
      kind: "handoff",
      opsPatch: {
        status: "aguardando_humano",
        queueHint: "Conversa na fila — próximo agente disponível",
        threadPreview: opsBeforeReply.lastClientMessage ?? opsBeforeReply.threadPreview,
      },
    };
  }

  for (const [key, reply] of Object.entries(def.keywordReplies)) {
    if (normalized.includes(key)) {
      return {
        botText: reply,
        kind: "text",
        opsPatch: {
          status: opsBeforeReply.status === "nova" ? "bot_ativo" : opsBeforeReply.status,
          queueHint: "Automação ativa — sem itens na fila humana",
        },
      };
    }
  }

  return {
    botText: def.defaultReply,
    kind: "text",
    opsPatch: {
      status: opsBeforeReply.status === "nova" ? "bot_ativo" : opsBeforeReply.status,
    },
  };
}

/**
 * Após handoff, próxima mensagem pode simular entrada na fila.
 */
export function applyHandoffQueueVisual(ops: DemoOpsState): DemoOpsState {
  if (ops.status !== "aguardando_humano") return ops;
  return {
    ...ops,
    status: "na_fila",
    queueHint: "Posição estimada: 1 — agente notificado",
  };
}
