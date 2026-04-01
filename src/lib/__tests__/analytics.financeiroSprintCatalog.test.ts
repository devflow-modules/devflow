/**
 * Catálogo único dos eventos Financeiro da sprint (nomes estáveis).
 * Complementa testes focados em analytics.financeiro*.test.ts
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockedTrack = vi.hoisted(() => vi.fn());
vi.mock("@vercel/analytics", () => ({ track: mockedTrack }));

import {
  trackFinanceiroAutoRedirected,
  trackFinanceiroGoToDashboardClicked,
  trackFinanceiroInsightClicked,
  trackFinanceiroInsightViewed,
  trackFinanceiroMobileExpandChecklist,
  trackFinanceiroMobileExpandInsights,
  trackFinanceiroMobileExpandScoreBreakdown,
  trackFinanceiroQuickActionClicked,
  trackFinanceiroRecentAccessClicked,
  trackFinanceiroResumeClicked,
  trackFinanceiroResumeLastRoute,
  trackFinanceiroReturnDetected,
  trackFinanceiroScoreBreakdownClicked,
  trackFinanceiroScoreViewed,
  trackFinanceiroTaskClicked,
  trackFinanceiroTaskCompleted,
  trackFinanceiroTaskViewed,
} from "../analytics";

const navBase = {
  source_path: "/ferramentas/financeiro",
  target_path: "/ferramentas/financeiro/dashboard",
  has_last_route: true,
  redirect_type: "test",
};

describe("analytics — catálogo completo Financeiro (sprint)", () => {
  beforeEach(() => mockedTrack.mockClear());

  it("dispara todos os eventos esperados com nomes corretos", () => {
    trackFinanceiroReturnDetected(navBase);
    expect(mockedTrack).toHaveBeenCalledWith("financeiro_return_detected", navBase);

    trackFinanceiroAutoRedirected(navBase);
    expect(mockedTrack).toHaveBeenCalledWith("financeiro_auto_redirected", navBase);

    trackFinanceiroResumeLastRoute({ ...navBase, interaction: "auto" });
    expect(mockedTrack).toHaveBeenCalledWith("financeiro_resume_last_route", {
      ...navBase,
      interaction: "auto",
    });

    trackFinanceiroGoToDashboardClicked({
      source_path: "/x",
      target_path: "/ferramentas/financeiro/dashboard",
      has_last_route: false,
      surface: "test",
    });
    expect(mockedTrack).toHaveBeenCalledWith("financeiro_go_to_dashboard_clicked", expect.any(Object));

    trackFinanceiroQuickActionClicked({
      action_type: "new_expense",
      source: "dashboard",
      position: 0,
      has_last_action: false,
      target_path: "/ferramentas/financeiro/expenses",
    });
    expect(mockedTrack).toHaveBeenCalledWith("financeiro_quick_action_clicked", expect.any(Object));

    trackFinanceiroResumeClicked({
      source: "dashboard",
      has_last_action: true,
      target_path: "/ferramentas/financeiro/expenses",
    });
    expect(mockedTrack).toHaveBeenCalledWith("financeiro_resume_clicked", expect.any(Object));

    trackFinanceiroRecentAccessClicked({
      source: "dashboard",
      position: 0,
      target_path: "/ferramentas/financeiro/rules",
    });
    expect(mockedTrack).toHaveBeenCalledWith("financeiro_recent_access_clicked", expect.any(Object));

    trackFinanceiroInsightViewed({
      insight_type: "warning",
      insight_id: "x",
      priority: 1,
      cta_target: "/e",
      position: 0,
    });
    expect(mockedTrack).toHaveBeenCalledWith("financeiro_insight_viewed", expect.any(Object));

    trackFinanceiroInsightClicked({
      insight_type: "warning",
      insight_id: "x",
      priority: 1,
      cta_target: "/e",
      position: 0,
    });
    expect(mockedTrack).toHaveBeenCalledWith("financeiro_insight_clicked", expect.any(Object));

    trackFinanceiroTaskViewed({
      task_id: "t1",
      completed: false,
      progress: 0,
      position: 0,
    });
    expect(mockedTrack).toHaveBeenCalledWith("financeiro_task_viewed", expect.any(Object));

    trackFinanceiroTaskClicked({
      task_id: "t1",
      completed: false,
      progress: 20,
      position: 0,
    });
    expect(mockedTrack).toHaveBeenCalledWith("financeiro_task_clicked", expect.any(Object));

    trackFinanceiroTaskCompleted({
      task_id: "t1",
      progress: 40,
      position: 0,
    });
    expect(mockedTrack).toHaveBeenCalledWith("financeiro_task_completed", expect.any(Object));

    trackFinanceiroScoreViewed({
      score: 50,
      level: "warning",
      lowest_factor: "a",
      highest_factor: "b",
    });
    expect(mockedTrack).toHaveBeenCalledWith("financeiro_score_viewed", expect.any(Object));

    trackFinanceiroScoreBreakdownClicked({
      score: 50,
      level: "warning",
      lowest_factor: "a",
      highest_factor: "b",
      criterion_id: "c",
    });
    expect(mockedTrack).toHaveBeenCalledWith("financeiro_score_breakdown_clicked", expect.any(Object));

    trackFinanceiroMobileExpandScoreBreakdown();
    expect(mockedTrack).toHaveBeenCalledWith("financeiro_mobile_expand_score_breakdown", {});

    trackFinanceiroMobileExpandInsights({ hidden_count: 2 });
    expect(mockedTrack).toHaveBeenCalledWith("financeiro_mobile_expand_insights", { hidden_count: 2 });

    trackFinanceiroMobileExpandChecklist({ hidden_count: 3 });
    expect(mockedTrack).toHaveBeenCalledWith("financeiro_mobile_expand_checklist", { hidden_count: 3 });
  });
});
