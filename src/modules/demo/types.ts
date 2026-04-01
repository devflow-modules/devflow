export type DemoScenarioId = "restaurante" | "tabacaria" | "loja";

export type DemoOpsStatus = "nova" | "bot_ativo" | "aguardando_humano" | "na_fila";

export interface DemoOpsState {
  threadPreview: string;
  status: DemoOpsStatus;
  queueHint: string;
  lastClientMessage?: string;
}

export type DemoReplyKind = "text" | "handoff";

export interface DemoReply {
  botText: string;
  kind: DemoReplyKind;
  opsPatch?: Partial<DemoOpsState>;
}

export interface DemoScenarioDefinition {
  id: DemoScenarioId;
  label: string;
  shortLabel: string;
  description: string;
  /** Primeira mensagem do bot após escolha do cenário */
  intro: string;
  /** Atalhos sugeridos na ordem do roteiro */
  suggestedPrompts: string[];
  /** Respostas por texto normalizado do usuário (substring match) */
  keywordReplies: Record<string, string>;
  defaultReply: string;
}
