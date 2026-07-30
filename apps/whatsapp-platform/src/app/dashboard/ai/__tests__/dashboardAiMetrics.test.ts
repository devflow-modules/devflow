import { describe, it, expect } from "vitest";
import {
  DASHBOARD_AI_ADVANCED_METRICS_SUMMARY,
  DASHBOARD_AI_AUTOMATION_KPI_LABEL,
  DASHBOARD_AI_ESSENTIAL_KPI_MAX,
  DASHBOARD_AI_EXTRA_EVENT_METRICS_SUMMARY,
  buildEssentialKpiCards,
  buildExtraEventKpiCards,
} from "../dashboardAiMetrics";
import type { ManagerDashboardMetrics } from "../managerDashboardAi";

const sample: ManagerDashboardMetrics = {
  totalMessages: 100,
  autoReplies: 80,
  fallbacks: 5,
  errors: 2,
  blockedDecisions: 1,
  avgLatency: 120,
  periodDays: 30,
  automationPercent: 80,
  fallbackPercent: 5,
  errorPercent: 2,
};

describe("dashboardAiMetrics (dashboard-ai F2)", () => {
  it("caminho principal tem ≤3 KPIs e % automação uma vez", () => {
    const cards = buildEssentialKpiCards(sample);
    expect(cards.length).toBeLessThanOrEqual(DASHBOARD_AI_ESSENTIAL_KPI_MAX);
    expect(cards.length).toBe(3);
    const automationLabels = cards.filter((c) => c.label === DASHBOARD_AI_AUTOMATION_KPI_LABEL);
    expect(automationLabels).toHaveLength(1);
    expect(String(automationLabels[0]!.value)).toContain("80%");
  });

  it("métricas extra não repetem % automação", () => {
    const extra = buildExtraEventKpiCards(sample);
    expect(extra.every((c) => c.label !== DASHBOARD_AI_AUTOMATION_KPI_LABEL)).toBe(true);
    expect(extra.map((c) => c.label)).toEqual([
      "Respostas automáticas",
      "Fallbacks",
      "Latência média",
    ]);
  });

  it("summaries de progressive disclosure definidos", () => {
    expect(DASHBOARD_AI_ADVANCED_METRICS_SUMMARY).toMatch(/leads|funil/i);
    expect(DASHBOARD_AI_EXTRA_EVENT_METRICS_SUMMARY).toMatch(/métricas|eventos/i);
  });
});
