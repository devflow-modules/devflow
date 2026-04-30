import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
const mockDashboard = vi.fn();

vi.mock("@/modules/auth", () => ({
  getAuthFromRequest: (...a: unknown[]) => mockAuth(...a),
}));
vi.mock("@/modules/billing/billingService", () => ({
  getUsageDashboard: (...a: unknown[]) => mockDashboard(...a),
}));

describe("GET /api/billing/usage", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ payload: { tenantId: "t-bill", role: "manager" } });
    mockDashboard.mockResolvedValue({
      period: "2025-03",
      messagesSent: 5,
      aiResponses: 2,
      limits: { messagesPerMonth: 500, aiResponsesPerMonth: 50 },
      unitPricesBrl: { message: 0.05, aiResponse: 0.1 },
      estimatedVariableCostBrl: 0.45,
      withinLimits: { messages: true, ai: true },
      allowsMeteredOverage: true,
      enforceLimits: true,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("401 sem auth", async () => {
    mockAuth.mockResolvedValue(null);
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "SAAS");
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://x/api/billing/usage"));
    expect(res.status).toBe(401);
  });

  it("retorna uso do tenant (SAAS)", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "SAAS");
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://x/api/billing/usage"));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(j.data.messagesSent).toBe(5);
    expect(j.examples).toBeDefined();
    expect(mockDashboard).toHaveBeenCalledWith("t-bill", undefined);
  });

  it("WHITE_LABEL + manager — indisponível (gate antes da sanitização)", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "WHITE_LABEL");
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://x/api/billing/usage"));
    expect(res.status).toBe(403);
    const j = await res.json();
    expect(j.success).toBe(false);
    expect(mockDashboard).not.toHaveBeenCalled();
  });
});
