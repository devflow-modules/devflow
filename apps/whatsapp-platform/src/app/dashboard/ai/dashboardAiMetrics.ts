/**
 * Superfície de métricas da home `/dashboard/ai` (dashboard-ai F2).
 * Caminho principal: KPIs essenciais (automação uma vez). CRM/funil em details.
 */

import type { ManagerDashboardMetrics } from "./managerDashboardAi";

export const DASHBOARD_AI_ESSENTIAL_KPI_MAX = 3;

export const DASHBOARD_AI_AUTOMATION_KPI_LABEL = "% automação";

export const DASHBOARD_AI_ADVANCED_METRICS_SUMMARY = "Leads, oportunidades e funil";

export const DASHBOARD_AI_EXTRA_EVENT_METRICS_SUMMARY = "Mais métricas de eventos";

export type DashboardAiKpiCard = {
  label: string;
  value: string | number;
  hint: string;
  emphasis?: boolean;
};

/** KPIs do caminho principal — `% automação` aparece só aqui (não em Resumo/Insights). */
export function buildEssentialKpiCards(metrics: ManagerDashboardMetrics): DashboardAiKpiCard[] {
  const automation = metrics.automationPercent;
  return [
    {
      label: DASHBOARD_AI_AUTOMATION_KPI_LABEL,
      value: automation != null ? `${automation}%` : "—",
      hint: `auto_reply ÷ eventos · ${metrics.periodDays} dias`,
      emphasis: true,
    },
    {
      label: "Total de eventos",
      value: metrics.totalMessages,
      hint: `Últimos ${metrics.periodDays} dias`,
      emphasis: true,
    },
    {
      label: "Erros",
      value: metrics.errors,
      hint: "Provedor ou pipeline",
      emphasis: false,
    },
  ];
}

/** Métricas de eventos secundárias (progressive disclosure). */
export function buildExtraEventKpiCards(metrics: ManagerDashboardMetrics): DashboardAiKpiCard[] {
  return [
    {
      label: "Respostas automáticas",
      value: metrics.autoReplies,
      hint: "IA gerou e enviou",
    },
    {
      label: "Fallbacks",
      value: metrics.fallbacks,
      hint: "LLM sem resposta útil",
    },
    {
      label: "Latência média",
      value: `${metrics.avgLatency} ms`,
      hint: "Quando registado",
    },
  ];
}
