import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetAuth = vi.fn();
const mockGetAiUsageMetrics = vi.fn();

vi.mock("@/modules/auth", async () => {
  const actual = await vi.importActual<typeof import("@/modules/auth")>("@/modules/auth");
  return {
    ...actual,
    getAuthFromRequest: (...a: unknown[]) => mockGetAuth(...a),
  };
});
vi.mock("@/modules/ai/aiUsageService", () => ({
  getAiUsageMetrics: (...a: unknown[]) => mockGetAiUsageMetrics(...a),
}));

describe("/api/ai/usage", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "SAAS");
    mockGetAuth.mockResolvedValue({
      payload: { tenantId: "t-usage", sub: "u1", role: "manager" },
    });
    mockGetAiUsageMetrics.mockResolvedValue({
      messagesTotal: 120,
      aiMessagesTotal: 80,
      fallbackTotal: 10,
      tokensUsedTotal: 18000,
      estimatedCostUsd: 2.34,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("GET 401 sem auth", async () => {
    mockGetAuth.mockResolvedValue(null);
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://x/api/ai/usage"));
    expect(res.status).toBe(401);
  });

  it("GET retorna métricas completas (SAAS)", async () => {
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://x/api/ai/usage"));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(j.data.messages_total).toBe(120);
    expect(j.data.ai_messages_total).toBe(80);
    expect(j.data.fallback_total).toBe(10);
    expect(j.data.tokens_used_total).toBe(18000);
    expect(j.data.estimated_cost_usd).toBe(2.34);
  });

  it("WHITE_LABEL + manager omite custo e tokens", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "WHITE_LABEL");
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://x/api/ai/usage"));
    const j = await res.json();
    expect(j.data).toEqual({
      messages_total: 120,
      ai_messages_total: 80,
      fallback_total: 10,
    });
    expect(j.data).not.toHaveProperty("estimated_cost_usd");
  });

  it("WHITE_LABEL + platform_admin mantém métricas completas", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "WHITE_LABEL");
    mockGetAuth.mockResolvedValue({
      payload: { tenantId: "t-usage", sub: "u1", role: "platform_admin" },
    });
    const { GET } = await import("../route");
    const j = await (await GET(new NextRequest("http://x/api/ai/usage"))).json();
    expect(j.data.estimated_cost_usd).toBe(2.34);
  });

  it("GET 403 para operador", async () => {
    mockGetAuth.mockResolvedValue({
      payload: { tenantId: "t-usage", sub: "u1", role: "operator" },
    });
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://x/api/ai/usage"));
    expect(res.status).toBe(403);
  });
});
