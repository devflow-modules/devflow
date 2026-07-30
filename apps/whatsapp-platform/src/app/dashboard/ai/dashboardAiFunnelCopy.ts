/**
 * Rótulos PT unificados do funil comercial (barras + legenda).
 */

export const DASHBOARD_AI_FUNNEL_STAGES = [
  { key: "lead", label: "Lead", description: "primeiro contacto" },
  { key: "qualifying", label: "Qualificação", description: "entender necessidade" },
  { key: "negotiating", label: "Negociação", description: "tentar fechar" },
  { key: "support", label: "Suporte", description: "atendimento" },
  { key: "closed", label: "Fechado", description: "venda concluída" },
] as const;

export type DashboardAiFunnelStageKey = (typeof DASHBOARD_AI_FUNNEL_STAGES)[number]["key"];
