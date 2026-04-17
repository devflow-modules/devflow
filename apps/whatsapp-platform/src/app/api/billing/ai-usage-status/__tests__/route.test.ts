import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetAuth = vi.fn();
const mockGetAiUsageStatus = vi.fn();

vi.mock("@/modules/auth", () => ({
  getAuthFromRequest: (...a: unknown[]) => mockGetAuth(...a),
}));
vi.mock("@/modules/billing/aiUsageLimitService", () => ({
  getAiUsageStatus: (...a: unknown[]) => mockGetAiUsageStatus(...a),
}));
vi.mock("@/modules/billing/aiOverageVisibilityService", () => ({
  getAiOverageBilledInPeriod: vi.fn().mockResolvedValue({
    aiOverageBilled: 0,
    aiOverageCostBrl: 0,
  }),
}));

describe("GET /api/billing/ai-usage-status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mockGetAuth.mockResolvedValue({
      payload: { tenantId: "t-status", sub: "u1", role: "manager" },
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

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("401 sem auth", async () => {
    mockGetAuth.mockResolvedValue(null);
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://x/api/billing/ai-usage-status"));
    expect(res.status).toBe(401);
  });

  it("retorna status completo (SAAS)", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "SAAS");
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

  it("WHITE_LABEL + manager só expõe gating operacional", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "WHITE_LABEL");
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://x/api/billing/ai-usage-status"));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.data).toEqual({
      can_use: true,
      should_fallback_to_legacy: false,
      period: "2025-03",
    });
    expect(j.data).not.toHaveProperty("plan");
    expect(j.data).not.toHaveProperty("used");
  });

  it("WHITE_LABEL + platform_admin retorna payload completo", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "WHITE_LABEL");
    mockGetAuth.mockResolvedValue({
      payload: { tenantId: "t-status", sub: "u1", role: "platform_admin" },
    });
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://x/api/billing/ai-usage-status"));
    const j = await res.json();
    expect(j.data.used).toBe(80);
    expect(j.data.plan).toBe("STARTER");
  });
});
