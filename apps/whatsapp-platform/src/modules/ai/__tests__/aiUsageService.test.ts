import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();
const mockFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiUsageLog: {
      create: (...a: unknown[]) => mockCreate(...a),
      findMany: (...a: unknown[]) => mockFindMany(...a),
    },
  },
}));

describe("aiUsageService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({});
  });

  it("trackAiUsage salva ai_success com tokens", async () => {
    const { trackAiUsage } = await import("../aiUsageService");
    trackAiUsage("t1", "AI_SUCCESS", 100);
    await vi.waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          tenantId: "t1",
          type: "AI_SUCCESS",
          tokens: 100,
        },
      });
    });
  });

  it("trackAiUsage salva ai_fallback sem tokens", async () => {
    const { trackAiUsage } = await import("../aiUsageService");
    trackAiUsage("t1", "AI_FALLBACK");
    await vi.waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          tenantId: "t1",
          type: "AI_FALLBACK",
          tokens: 0,
        },
      });
    });
  });

  it("trackAiUsage ignora tenant env", async () => {
    const { trackAiUsage } = await import("../aiUsageService");
    trackAiUsage("env", "MESSAGE_TOTAL");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("getAiUsageMetrics agrega corretamente", async () => {
    mockFindMany.mockResolvedValue([
      { type: "MESSAGE_TOTAL", tokens: 0 },
      { type: "MESSAGE_TOTAL", tokens: 0 },
      { type: "AI_SUCCESS", tokens: 50 },
      { type: "AI_SUCCESS", tokens: 100 },
      { type: "AI_FALLBACK", tokens: 0 },
    ]);
    const { getAiUsageMetrics } = await import("../aiUsageService");
    const m = await getAiUsageMetrics("t1");
    expect(m.messagesTotal).toBe(2);
    expect(m.aiMessagesTotal).toBe(2);
    expect(m.fallbackTotal).toBe(1);
    expect(m.tokensUsedTotal).toBe(150);
    expect(typeof m.estimatedCostUsd).toBe("number");
    expect(m.estimatedCostUsd).toBeGreaterThanOrEqual(0);
  });
});
