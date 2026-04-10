import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeAutomationPercent, getAiOperationalMetrics } from "../aiMetricsService";

const findMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiMessageLog: {
      findMany: (...a: unknown[]) => findMany(...a),
    },
  },
}));

describe("getAiOperationalMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("agrega eventKind e latência média", async () => {
    findMany.mockResolvedValue([
      { eventKind: "auto_reply", durationMs: 100 },
      { eventKind: "auto_reply", durationMs: 200 },
      { eventKind: "fallback", durationMs: null },
      { eventKind: "error", durationMs: 500 },
      { eventKind: "blocked_by_guard", durationMs: null },
    ]);

    const m = await getAiOperationalMetrics("t1", 30);
    expect(m.autoReplies).toBe(2);
    expect(m.fallbacks).toBe(1);
    expect(m.errors).toBe(1);
    expect(m.blockedDecisions).toBe(1);
    expect(m.totalMessages).toBe(5);
    expect(m.avgLatencyMs).toBe(267);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: "t1" }),
      })
    );
  });
});

describe("computeAutomationPercent", () => {
  it("retorna null quando não há eventos no período", () => {
    expect(
      computeAutomationPercent({
        totalMessages: 0,
        autoReplies: 0,
        fallbacks: 0,
        errors: 0,
        blockedDecisions: 0,
        avgLatencyMs: 0,
        periodDays: 30,
      })
    ).toBeNull();
  });

  it("usa autoReplies / totalMessages (percentagem com uma casa)", () => {
    expect(
      computeAutomationPercent({
        totalMessages: 100,
        autoReplies: 80,
        fallbacks: 10,
        errors: 10,
        blockedDecisions: 0,
        avgLatencyMs: 0,
        periodDays: 30,
      })
    ).toBe(80);
  });
});
