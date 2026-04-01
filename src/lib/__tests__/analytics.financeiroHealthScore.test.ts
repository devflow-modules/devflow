import { describe, expect, it, vi, beforeEach } from "vitest";

const mockedTrack = vi.hoisted(() => vi.fn());

vi.mock("@vercel/analytics", () => ({
  track: mockedTrack,
}));

import {
  trackFinanceiroScoreBreakdownClicked,
  trackFinanceiroScoreViewed,
} from "../analytics";

describe("analytics — score de saúde Financeiro", () => {
  beforeEach(() => {
    mockedTrack.mockClear();
  });

  it("dispara viewed e breakdown_clicked com propriedades", () => {
    trackFinanceiroScoreViewed({
      score: 72,
      level: "progress",
      lowest_factor: "score_rules",
      highest_factor: "score_income",
    });
    expect(mockedTrack).toHaveBeenCalledWith(
      "financeiro_score_viewed",
      expect.objectContaining({
        score: 72,
        level: "progress",
        lowest_factor: "score_rules",
        highest_factor: "score_income",
      })
    );

    trackFinanceiroScoreBreakdownClicked({
      score: 72,
      level: "progress",
      lowest_factor: "score_rules",
      highest_factor: "score_income",
      criterion_id: "score_categories",
    });
    expect(mockedTrack).toHaveBeenCalledWith(
      "financeiro_score_breakdown_clicked",
      expect.objectContaining({ criterion_id: "score_categories" })
    );
  });
});
