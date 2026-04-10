import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { resetAiMetricsRateLimitBucketsForTest } from "@/lib/aiMetricsRateLimit";

const mockGetAuthFromRequest = vi.fn();
const mockGetAiOperationalMetrics = vi.hoisted(() => vi.fn());

vi.mock("@/modules/auth", async () => {
  const actual = await vi.importActual<typeof import("@/modules/auth")>("@/modules/auth");
  return {
    ...actual,
    getAuthFromRequest: (...a: unknown[]) => mockGetAuthFromRequest(...a),
  };
});

vi.mock("@/modules/ai/aiMetricsService", async () => {
  const actual = await vi.importActual<typeof import("@/modules/ai/aiMetricsService")>(
    "@/modules/ai/aiMetricsService"
  );
  return {
    ...actual,
    getAiOperationalMetrics: (...a: unknown[]) => mockGetAiOperationalMetrics(...a),
  };
});

const sampleMetrics = {
  totalMessages: 100,
  autoReplies: 80,
  fallbacks: 10,
  errors: 10,
  blockedDecisions: 0,
  avgLatencyMs: 900,
  periodDays: 30,
};

describe("GET /api/ai/metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAiMetricsRateLimitBucketsForTest();
    mockGetAiOperationalMetrics.mockResolvedValue(sampleMetrics);
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
    const res = await GET(new NextRequest(new URL("http://localhost/api/ai/metrics")));
    expect(res.status).toBe(401);
    const j = await res.json();
    expect(j.error).toBeDefined();
  });

  it("retorna 403 para operator com mensagem coerente", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: {
        tenantId: "t1",
        sub: "u-op",
        email: "o@b.com",
        name: "Op",
        role: "operator",
      },
    });
    const { GET } = await import("../route");
    const res = await GET(new NextRequest(new URL("http://localhost/api/ai/metrics")));
    expect(res.status).toBe(403);
    const j = await res.json();
    expect(j.error).toBe("Acesso negado");
  });

  it("retorna 200 para manager com payload e automationPercent = autoReplies/totalMessages", async () => {
    const { GET } = await import("../route");
    const res = await GET(new NextRequest(new URL("http://localhost/api/ai/metrics")));
    expect(res.status).toBe(200);
    const j = (await res.json()) as {
      success: boolean;
      data: {
        totalMessages: number;
        autoReplies: number;
        fallbacks: number;
        errors: number;
        avgLatency: number;
        automationPercent: number | null;
      };
    };
    expect(j.success).toBe(true);
    expect(j.data.totalMessages).toBe(100);
    expect(j.data.autoReplies).toBe(80);
    expect(j.data.fallbacks).toBe(10);
    expect(j.data.errors).toBe(10);
    expect(j.data.avgLatency).toBe(900);
    expect(j.data.automationPercent).toBe(80);
    expect(mockGetAiOperationalMetrics).toHaveBeenCalledWith("t1", 30);
  });

  it("retorna 200 para platform_admin", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: {
        tenantId: "t1",
        sub: "u-admin",
        email: "a@b.com",
        name: "Admin",
        role: "platform_admin",
      },
    });
    const { GET } = await import("../route");
    const res = await GET(new NextRequest(new URL("http://localhost/api/ai/metrics")));
    expect(res.status).toBe(200);
    const j = (await res.json()) as { success: boolean };
    expect(j.success).toBe(true);
  });

  it("aplica rate limit após muitas chamadas (429)", async () => {
    const { GET } = await import("../route");
    for (let i = 0; i < 60; i++) {
      const res = await GET(new NextRequest(new URL("http://localhost/api/ai/metrics")));
      expect(res.status).toBe(200);
    }
    const res429 = await GET(new NextRequest(new URL("http://localhost/api/ai/metrics")));
    expect(res429.status).toBe(429);
    const j = await res429.json();
    expect(j.success).toBe(false);
    expect(String(j.error)).toContain("minuto");
  });
});
