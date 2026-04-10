import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { resetAiFunnelMetricsRateLimitBucketsForTest } from "@/lib/aiFunnelRateLimit";

const mockGetAuth = vi.fn();
const mockGetFunnel = vi.hoisted(() => vi.fn());

vi.mock("@/modules/auth", async () => {
  const actual = await vi.importActual<typeof import("@/modules/auth")>("@/modules/auth");
  return {
    ...actual,
    getAuthFromRequest: (...a: unknown[]) => mockGetAuth(...a),
  };
});

vi.mock("@/modules/ai/aiFunnelMetricsService", () => ({
  getAiFunnelMetrics: (...a: unknown[]) => mockGetFunnel(...a),
}));

describe("GET /api/ai/funnel-metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAiFunnelMetricsRateLimitBucketsForTest();
    mockGetAuth.mockResolvedValue({
      payload: { tenantId: "t1", sub: "u1", role: "manager" },
    });
    mockGetFunnel.mockResolvedValue({
      lead: 1,
      qualifying: 2,
      negotiating: 3,
      support: 0,
      closed: 1,
    });
  });

  it("403 para operator", async () => {
    mockGetAuth.mockResolvedValue({ payload: { tenantId: "t1", sub: "u1", role: "operator" } });
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://localhost/api/ai/funnel-metrics"));
    expect(res.status).toBe(403);
  });

  it("200 com contagens", async () => {
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://localhost/api/ai/funnel-metrics"));
    expect(res.status).toBe(200);
    const j = (await res.json()) as { success: boolean; data: { lead: number } };
    expect(j.success).toBe(true);
    expect(j.data.lead).toBe(1);
    expect(mockGetFunnel).toHaveBeenCalledWith("t1");
  });
});
