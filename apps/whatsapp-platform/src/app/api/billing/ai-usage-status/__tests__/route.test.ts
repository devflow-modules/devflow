import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetAuth = vi.fn();
const mockGetAiUsageStatus = vi.fn();

vi.mock("@/modules/auth", () => ({
  getAuthFromRequest: (...a: unknown[]) => mockGetAuth(...a),
}));
vi.mock("@/modules/billing/aiUsageLimitService", () => ({
  getAiUsageStatus: (...a: unknown[]) => mockGetAiUsageStatus(...a),
}));

describe("GET /api/billing/ai-usage-status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuth.mockResolvedValue({
      payload: { tenantId: "t-status", sub: "u1", role: "admin" },
    });
    mockGetAiUsageStatus.mockResolvedValue({
      used: 80,
      limit: 100,
      percentUsed: 80,
      canUse: true,
      shouldFallbackToLegacy: false,
      period: "2025-03",
      plan: "STARTER",
    });
  });

  it("401 sem auth", async () => {
    mockGetAuth.mockResolvedValue(null);
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://x/api/billing/ai-usage-status"));
    expect(res.status).toBe(401);
  });

  it("retorna status", async () => {
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://x/api/billing/ai-usage-status"));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(j.data.used).toBe(80);
    expect(j.data.limit).toBe(100);
    expect(j.data.percent_used).toBe(80);
    expect(j.data.can_use).toBe(true);
  });
});
