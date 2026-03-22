import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetAuth = vi.fn();
const mockGetAiPlanInfo = vi.fn();

vi.mock("@/modules/auth", () => ({
  getAuthFromRequest: (...a: unknown[]) => mockGetAuth(...a),
}));
vi.mock("@/modules/billing/aiUsageLimitService", () => ({
  getAiPlanInfo: (...a: unknown[]) => mockGetAiPlanInfo(...a),
}));

describe("GET /api/billing/ai-plan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuth.mockResolvedValue({
      payload: { tenantId: "t-plan", sub: "u1", role: "admin" },
    });
    mockGetAiPlanInfo.mockResolvedValue({
      plan: "PRO",
      planName: "Pro",
      aiLimit: 750,
      aiLimitLabel: "750/mês",
    });
  });

  it("401 sem auth", async () => {
    mockGetAuth.mockResolvedValue(null);
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://x/api/billing/ai-plan"));
    expect(res.status).toBe(401);
  });

  it("retorna info do plano", async () => {
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://x/api/billing/ai-plan"));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(j.data.plan).toBe("PRO");
    expect(j.data.plan_name).toBe("Pro");
    expect(j.data.ai_limit).toBe(750);
  });
});
