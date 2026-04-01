import { describe, expect, it, vi, beforeEach } from "vitest";

const mockedTrack = vi.hoisted(() => vi.fn());

vi.mock("@vercel/analytics", () => ({
  track: mockedTrack,
}));

import {
  trackFinanceiroQuickActionClicked,
  trackFinanceiroRecentAccessClicked,
  trackFinanceiroResumeClicked,
} from "../analytics";

describe("analytics — operação Financeiro", () => {
  beforeEach(() => {
    mockedTrack.mockClear();
  });

  it("dispara eventos com propriedades", () => {
    trackFinanceiroQuickActionClicked({
      action_type: "new_expense",
      source: "dashboard",
      position: 0,
      has_last_action: true,
      target_path: "/ferramentas/financeiro/expenses#x",
    });
    expect(mockedTrack).toHaveBeenCalledWith("financeiro_quick_action_clicked", expect.objectContaining({
      action_type: "new_expense",
      source: "dashboard",
      position: 0,
      has_last_action: true,
    }));

    trackFinanceiroResumeClicked({
      source: "dashboard",
      has_last_action: true,
      target_path: "/ferramentas/financeiro/expenses",
      action_type: "expense_added",
    });
    expect(mockedTrack).toHaveBeenCalledWith("financeiro_resume_clicked", expect.objectContaining({
      has_last_action: true,
      target_path: "/ferramentas/financeiro/expenses",
    }));

    trackFinanceiroRecentAccessClicked({
      source: "dashboard",
      position: 1,
      target_path: "/ferramentas/financeiro/rules",
    });
    expect(mockedTrack).toHaveBeenCalledWith("financeiro_recent_access_clicked", {
      source: "dashboard",
      position: 1,
      target_path: "/ferramentas/financeiro/rules",
    });
  });
});
