import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { resetAiMetricsRateLimitBucketsForTest } from "@/lib/aiMetricsRateLimit";

const mockGetAuthFromRequest = vi.fn();
const mockGetLeadQualityMetrics = vi.hoisted(() => vi.fn());

vi.mock("@/modules/auth", async () => {
  const actual = await vi.importActual<typeof import("@/modules/auth")>("@/modules/auth");
  return {
    ...actual,
    getAuthFromRequest: (...a: unknown[]) => mockGetAuthFromRequest(...a),
  };
});

vi.mock("@/modules/ai/leadQualityMetricsService", () => ({
  getLeadQualityMetrics: (...a: unknown[]) => mockGetLeadQualityMetrics(...a),
}));

describe("GET /api/ai/lead-metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAiMetricsRateLimitBucketsForTest();
    mockGetLeadQualityMetrics.mockResolvedValue({
      high: 2,
      medium: 5,
      low: 10,
      avgScore: 22.5,
    });
    mockGetAuthFromRequest.mockResolvedValue({
      payload: {
        tenantId: "t1",
        sub: "u-manager",
        email: "m@b.com",
        name: "Mgr",
        role: "manager",
      },
    });
  });

  it("retorna 401 quando não autenticado", async () => {
    mockGetAuthFromRequest.mockResolvedValue(null);
    const { GET } = await import("../route");
    const res = await GET(new NextRequest(new URL("http://localhost/api/ai/lead-metrics")));
    expect(res.status).toBe(401);
  });

  it("retorna 200 com contagens e média", async () => {
    const { GET } = await import("../route");
    const res = await GET(new NextRequest(new URL("http://localhost/api/ai/lead-metrics")));
    expect(res.status).toBe(200);
    const j = (await res.json()) as {
      success: boolean;
      data: { high: number; medium: number; low: number; avgScore: number };
    };
    expect(j.success).toBe(true);
    expect(j.data.high).toBe(2);
    expect(j.data.medium).toBe(5);
    expect(j.data.low).toBe(10);
    expect(j.data.avgScore).toBe(22.5);
    expect(mockGetLeadQualityMetrics).toHaveBeenCalledWith("t1");
  });
});
