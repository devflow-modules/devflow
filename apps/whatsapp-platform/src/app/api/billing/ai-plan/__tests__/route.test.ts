import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetAuth = vi.fn();
const mockGetAiPlanInfo = vi.fn();

vi.mock("@/modules/auth", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/modules/auth")>();
  return {
    ...mod,
    getAuthFromRequest: (...a: unknown[]) => mockGetAuth(...a),
  };
});
vi.mock("@/modules/billing/aiUsageLimitService", () => ({
  getAiPlanInfo: (...a: unknown[]) => mockGetAiPlanInfo(...a),
}));

describe("GET /api/billing/ai-plan", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    mockGetAuth.mockResolvedValue({
      payload: { tenantId: "t-plan", sub: "u1", role: "manager" },
    });
    mockGetAiPlanInfo.mockResolvedValue({
      plan: "PRO",
      planName: "Pro",
      aiLimit: 750,
      aiLimitLabel: "750/mês",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("401 sem auth", async () => {
    mockGetAuth.mockResolvedValue(null);
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "SAAS");
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://x/api/billing/ai-plan"));
    expect(res.status).toBe(401);
  });

  it("retorna info do plano (SAAS)", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "SAAS");
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://x/api/billing/ai-plan"));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(j.data.plan).toBe("PRO");
    expect(j.data.plan_name).toBe("Pro");
    expect(j.data.ai_limit).toBe(750);
  });

  it("WHITE_LABEL + manager — indisponível (gate antes da sanitização)", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "WHITE_LABEL");
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://x/api/billing/ai-plan"));
    expect(res.status).toBe(403);
    const j = await res.json();
    expect(j.success).toBe(false);
    expect(mockGetAiPlanInfo).not.toHaveBeenCalled();
  });

  it("WHITE_LABEL + platform_admin retorna plano completo", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "WHITE_LABEL");
    mockGetAuth.mockResolvedValue({
      payload: { tenantId: "t-plan", sub: "u1", role: "platform_admin" },
    });
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://x/api/billing/ai-plan"));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.data.plan).toBe("PRO");
    expect(j.data.plan_name).toBe("Pro");
  });

  it("403 para operador (SAAS)", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "SAAS");
    mockGetAuth.mockResolvedValue({
      payload: { tenantId: "t-plan", sub: "u1", role: "operator" },
    });
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://x/api/billing/ai-plan"));
    expect(res.status).toBe(403);
    expect(mockGetAiPlanInfo).not.toHaveBeenCalled();
  });
});
