/**
 * Lógica pura do painel de decisão (/dashboard/ai) — sem dependências de UI.
 */

export type ManagerDashboardMetrics = {
  totalMessages: number;
  autoReplies: number;
  fallbacks: number;
  errors: number;
  blockedDecisions: number;
  avgLatency: number;
  periodDays: number;
  automationPercent: number | null;
  fallbackPercent: number | null;
  errorPercent: number | null;
};

export type ManagerDashboardFunnel = {
  lead: number;
  qualifying: number;
  negotiating: number;
  support: number;
  closed: number;
};

export type ManagerDashboardLeadQuality = {
  high: number;
  medium: number;
  low: number;
  avgScore: number;
};

export type ManagerDashboardOpportunities = {
  highPending: number;
  stalled: number;
  negotiating: number;
  reactivationQueued: number;
};

export type ManagerActionItem = {
  type: string;
  label: string;
  action: string;
};

export function buildManagerActions(
  opportunities: ManagerDashboardOpportunities | null,
  funnel: ManagerDashboardFunnel | null
): ManagerActionItem[] {
  const out: ManagerActionItem[] = [];
  if (!opportunities) return out;

  if (opportunities.highPending > 0) {
    out.push({
      type: "high_no_response",
      label: `Urgente: ${opportunities.highPending} lead(s) HIGH sem resposta (pendente na equipa)`,
      action: "/inbox?filter=high_no_response",
    });
  }

  if (opportunities.stalled > 0) {
    out.push({
      type: "stalled",
      label: `Atenção: ${opportunities.stalled} conversa(s) paradas (qualificação/negociação sem actividade)`,
      action: "/inbox?filter=stalled",
    });
  }

  if (opportunities.reactivationQueued > 0) {
    out.push({
      type: "reactivation",
      label: `${opportunities.reactivationQueued} reativação(ões) na fila automática`,
      action: "/inbox?filter=reactivation",
    });
  }

  if (funnel && funnel.negotiating > 0 && opportunities.stalled === 0 && opportunities.highPending === 0) {
    out.push({
      type: "negotiating_watch",
      label: `${funnel.negotiating} conversa(s) em negociação — rever oportunidades`,
      action: "/inbox?phase=in_attendance",
    });
  }

  return out;
}

export function generateManagerInsights(
  metrics: ManagerDashboardMetrics | null,
  funnel: ManagerDashboardFunnel | null,
  opportunities: ManagerDashboardOpportunities | null,
  leadQuality: ManagerDashboardLeadQuality | null
): string[] {
  const insights: string[] = [];

  // F2: não repetir % automação (KPI essencial) nem highPending/stalled (ações recomendadas).

  if (leadQuality && opportunities) {
    if (opportunities.highPending === 0 && leadQuality.high > 0) {
      insights.push(
        `${leadQuality.high} conversa(s) classificadas como HIGH pelo score CRM — acompanhe as mais quentes primeiro.`
      );
    }
  }

  if (funnel && funnel.negotiating > 0 && insights.length < 3) {
    insights.push(`${funnel.negotiating} conversa(s) no estágio de negociação no funil.`);
  }

  if (metrics && metrics.fallbacks > 0 && insights.length < 3) {
    insights.push(
      `${metrics.fallbacks} fallback(s) de LLM no período — rever prompt ou casos limite nas definições de IA.`
    );
  }

  if (metrics && metrics.errors > 0 && insights.length < 3) {
    insights.push(
      `${metrics.errors} erro(s) de provedor ou pipeline no período — rever motor e logs recentes.`
    );
  }

  return insights.slice(0, 3);
}
