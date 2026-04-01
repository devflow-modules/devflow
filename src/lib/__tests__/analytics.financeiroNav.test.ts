import { describe, expect, it, vi, beforeEach } from "vitest";

const mockedTrack = vi.hoisted(() => vi.fn());

vi.mock("@vercel/analytics", () => ({
  track: mockedTrack,
}));

import {
  trackFinanceiroAutoRedirected,
  trackFinanceiroGoToDashboardClicked,
  trackFinanceiroResumeLastRoute,
  trackFinanceiroReturnDetected,
} from "../analytics";

describe("analytics — navegação Financeiro", () => {
  beforeEach(() => {
    mockedTrack.mockClear();
  });

  it("dispara os quatro eventos com propriedades esperadas", () => {
    const base = {
      source_path: "/ferramentas/financeiro",
      target_path: "/ferramentas/financeiro/sources",
      has_last_route: true,
      redirect_type: "from_landing",
    };

    trackFinanceiroReturnDetected(base);
    expect(mockedTrack).toHaveBeenCalledWith("financeiro_return_detected", base);

    trackFinanceiroAutoRedirected(base);
    expect(mockedTrack).toHaveBeenCalledWith("financeiro_auto_redirected", base);

    trackFinanceiroResumeLastRoute({ ...base, interaction: "auto" });
    expect(mockedTrack).toHaveBeenCalledWith("financeiro_resume_last_route", {
      ...base,
      interaction: "auto",
    });

    trackFinanceiroGoToDashboardClicked({
      source_path: "/ferramentas/financeiro/expenses",
      target_path: "/ferramentas/financeiro/dashboard",
      has_last_route: false,
      surface: "financeiro_sidebar",
    });
    expect(mockedTrack).toHaveBeenCalledWith("financeiro_go_to_dashboard_clicked", {
      source_path: "/ferramentas/financeiro/expenses",
      target_path: "/ferramentas/financeiro/dashboard",
      has_last_route: false,
      surface: "financeiro_sidebar",
    });
  });
});
