import { describe, expect, it } from "vitest";
import { computePracticeInsights } from "@/lib/session-insights";
import type { SessionRecord } from "@/lib/types";
import { emptyChecklist } from "@/lib/types";

const base = (over: Partial<SessionRecord>): SessionRecord => ({
  id: crypto.randomUUID(),
  problemId: "p",
  code: "",
  elapsedTimeSec: 60,
  checklist: emptyChecklist(),
  passedTests: 1,
  totalTests: 1,
  createdAt: "2025-01-01T00:00:00.000Z",
  ...over,
});

describe("computePracticeInsights", () => {
  it("returns nulls for empty list", () => {
    expect(computePracticeInsights([])).toEqual({
      totalSessions: 0,
      topFreezeReason: null,
      avgConfidenceAfter: null,
      keyboardRescueYesCount: 0,
    });
  });

  it("picks most common freeze reason with lexicographic tie-break", () => {
    const insights = computePracticeInsights([
      base({ freezeReasons: ["Time pressure"] }),
      base({ freezeReasons: ["Other", "Time pressure"] }),
      base({ freezeReasons: ["Explaining in English"] }),
    ]);
    expect(insights.totalSessions).toBe(3);
    expect(insights.topFreezeReason?.label).toBe("Time pressure");
    expect(insights.topFreezeReason?.count).toBe(2);
  });

  it("averages confidenceAfter when present", () => {
    const insights = computePracticeInsights([
      base({ confidenceAfter: 4 }),
      base({ confidenceAfter: 5 }),
      base({}),
    ]);
    expect(insights.avgConfidenceAfter).toBe(4.5);
  });

  it("returns null avg when no confidenceAfter", () => {
    const insights = computePracticeInsights([base({}), base({})]);
    expect(insights.avgConfidenceAfter).toBeNull();
  });

  it("counts sessions that logged Keyboard Rescue usage", () => {
    const insights = computePracticeInsights([
      base({ keyboardRescueUsed: true }),
      base({ keyboardRescueUsed: false }),
      base({ keyboardRescueUsed: null }),
      base({}),
    ]);
    expect(insights.keyboardRescueYesCount).toBe(1);
  });

  it("breaks ties on freeze reasons lexicographically", () => {
    const insights = computePracticeInsights([
      base({ freezeReasons: ["bbb"] }),
      base({ freezeReasons: ["aaa"] }),
    ]);
    expect(insights.topFreezeReason?.label).toBe("aaa");
    expect(insights.topFreezeReason?.count).toBe(1);
  });
});
