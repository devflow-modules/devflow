import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { resetAiMetricsRateLimitBucketsForTest } from "@/lib/aiMetricsRateLimit";

const mockGetAuthFromRequest = vi.fn();
const mockGetOpportunityMetrics = vi.hoisted(() => vi.fn());

vi.mock("@/modules/auth", async () => {
  const actual = await vi.importActual<typeof import("@/modules/auth")>("@/modules/auth");
  return {
    ...actual,
    getAuthFromRequest: (...a: unknown[]) => mockGetAuthFromRequest(...a),
  };
});

vi.mock("@/modules/commercial", async () => {
  const actual = await vi.importActual<typeof import("@/modules/commercial")>("@/modules/commercial");
  return {
    ...actual,
    getOpportunityMetrics: (...a: unknown[]) => mockGetOpportunityMetrics(...a),
  };
});

describe("GET /api/ai/opportunity-metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAiMetricsRateLimitBucketsForTest();
    mockGetOpportunityMetrics.mockResolvedValue({
      highPending: 3,
      stalled: 5,
      negotiating: 2,
      reactivationQueued: 1,
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

  it("retorna 200 com métricas de oportunidade", async () => {
    const { GET } = await import("../route");
    const res = await GET(new NextRequest(new URL("http://localhost/api/ai/opportunity-metrics")));
    expect(res.status).toBe(200);
    const j = (await res.json()) as {
      success: boolean;
      data: {
        highPending: number;
        stalled: number;
        negotiating: number;
        reactivationQueued: number;
      };
    };
    expect(j.success).toBe(true);
    expect(j.data.highPending).toBe(3);
    expect(j.data.stalled).toBe(5);
    expect(j.data.negotiating).toBe(2);
    expect(j.data.reactivationQueued).toBe(1);
    expect(mockGetOpportunityMetrics).toHaveBeenCalledWith("t1");
  });
});
