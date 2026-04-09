import { describe, it, expect, vi, beforeEach } from "vitest";
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
    vi.clearAllMocks();
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

  it("GET 401 sem auth", async () => {
    mockGetAuth.mockResolvedValue(null);
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://x/api/ai/usage"));
    expect(res.status).toBe(401);
  });

  it("GET retorna métricas", async () => {
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

  it("GET 403 para operador", async () => {
    mockGetAuth.mockResolvedValue({
      payload: { tenantId: "t-usage", sub: "u1", role: "operator" },
    });
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://x/api/ai/usage"));
    expect(res.status).toBe(403);
  });
});
