import { describe, expect, it, vi, beforeEach } from "vitest";

const mockedTrack = vi.hoisted(() => vi.fn());

vi.mock("@vercel/analytics", () => ({
  track: mockedTrack,
}));

import {
  trackFinanceiroMobileExpandChecklist,
  trackFinanceiroMobileExpandInsights,
  trackFinanceiroMobileExpandScoreBreakdown,
} from "../analytics";

describe("analytics — expansões mobile Financeiro", () => {
  beforeEach(() => {
    mockedTrack.mockClear();
  });

  it("dispara eventos de expansão mobile", () => {
    trackFinanceiroMobileExpandScoreBreakdown();
    expect(mockedTrack).toHaveBeenCalledWith("financeiro_mobile_expand_score_breakdown", {});

    trackFinanceiroMobileExpandInsights({ hidden_count: 2 });
    expect(mockedTrack).toHaveBeenCalledWith("financeiro_mobile_expand_insights", { hidden_count: 2 });

    trackFinanceiroMobileExpandChecklist({ hidden_count: 3 });
    expect(mockedTrack).toHaveBeenCalledWith("financeiro_mobile_expand_checklist", { hidden_count: 3 });
  });
});
