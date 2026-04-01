import { describe, expect, it, vi, beforeEach } from "vitest";

const mockedTrack = vi.hoisted(() => vi.fn());

vi.mock("@vercel/analytics", () => ({
  track: mockedTrack,
}));

import {
  trackFinanceiroTaskClicked,
  trackFinanceiroTaskCompleted,
  trackFinanceiroTaskViewed,
} from "../analytics";

describe("analytics — rotina mensal Financeiro", () => {
  beforeEach(() => {
    mockedTrack.mockClear();
  });

  it("dispara viewed, clicked e completed", () => {
    trackFinanceiroTaskViewed({
      task_id: "task_income",
      completed: false,
      progress: 0,
      position: 0,
    });
    expect(mockedTrack).toHaveBeenCalledWith(
      "financeiro_task_viewed",
      expect.objectContaining({ task_id: "task_income", progress: 0 })
    );

    trackFinanceiroTaskClicked({
      task_id: "task_expense",
      completed: false,
      progress: 20,
      position: 1,
    });
    expect(mockedTrack).toHaveBeenCalledWith("financeiro_task_clicked", expect.objectContaining({ task_id: "task_expense" }));

    trackFinanceiroTaskCompleted({
      task_id: "task_income",
      progress: 40,
      position: 0,
    });
    expect(mockedTrack).toHaveBeenCalledWith(
      "financeiro_task_completed",
      expect.objectContaining({ task_id: "task_income", completed: true })
    );
  });
});
