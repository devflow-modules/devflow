import { describe, expect, it, vi, beforeEach } from "vitest";

const mockedTrack = vi.hoisted(() => vi.fn());

vi.mock("@vercel/analytics", () => ({
  track: mockedTrack,
}));

import { trackFinanceiroInsightClicked, trackFinanceiroInsightViewed } from "../analytics";

describe("analytics — insights Financeiro", () => {
  beforeEach(() => {
    mockedTrack.mockClear();
  });

  it("dispara viewed e clicked com propriedades", () => {
    trackFinanceiroInsightViewed({
      insight_type: "warning",
      insight_id: "sem_despesas_mes",
      priority: 3,
      cta_target: "/ferramentas/financeiro/expenses",
      position: 0,
    });
    expect(mockedTrack).toHaveBeenCalledWith(
      "financeiro_insight_viewed",
      expect.objectContaining({
        insight_id: "sem_despesas_mes",
        priority: 3,
        cta_target: "/ferramentas/financeiro/expenses",
      })
    );

    trackFinanceiroInsightClicked({
      insight_type: "opportunity",
      insight_id: "sem_regras",
      priority: 6,
      cta_target: "/ferramentas/financeiro/rules",
    });
    expect(mockedTrack).toHaveBeenCalledWith(
      "financeiro_insight_clicked",
      expect.objectContaining({ insight_id: "sem_regras" })
    );
  });
});
