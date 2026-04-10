import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { resetAiLogsRateLimitBucketsForTest } from "@/lib/aiLogsRateLimit";

const mockGetAuth = vi.fn();
const mockListLogs = vi.hoisted(() => vi.fn());

vi.mock("@/modules/auth", async () => {
  const actual = await vi.importActual<typeof import("@/modules/auth")>("@/modules/auth");
  return {
    ...actual,
    getAuthFromRequest: (...a: unknown[]) => mockGetAuth(...a),
  };
});

vi.mock("@/modules/ai/aiLogsService", () => ({
  listRecentAiLogs: (...a: unknown[]) => mockListLogs(...a),
}));

describe("GET /api/ai/logs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAiLogsRateLimitBucketsForTest();
    mockGetAuth.mockResolvedValue({
      payload: { tenantId: "t1", sub: "u-m", role: "manager" },
    });
    mockListLogs.mockResolvedValue([
      {
        type: "auto_reply" as const,
        reason: "ok",
        createdAt: "2026-01-01T12:00:00.000Z",
        conversationId: "thr1",
      },
    ]);
  });

  it("403 para operator", async () => {
    mockGetAuth.mockResolvedValue({
      payload: { tenantId: "t1", sub: "u-o", role: "operator" },
    });
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://localhost/api/ai/logs"));
    expect(res.status).toBe(403);
    const j = await res.json();
    expect(j.error).toBe("Acesso negado");
  });

  it("200 para manager com lista e filtros repassados ao serviço", async () => {
    const { GET } = await import("../route");
    const res = await GET(
      new NextRequest("http://localhost/api/ai/logs?limit=10&type=error")
    );
    expect(res.status).toBe(200);
    const j = (await res.json()) as {
      success: boolean;
      data: { type: string }[];
    };
    expect(j.success).toBe(true);
    expect(Array.isArray(j.data)).toBe(true);
    expect(mockListLogs).toHaveBeenCalledWith("t1", { limit: 10, type: "error" });
  });

  it("429 após excesso de pedidos", async () => {
    const { GET } = await import("../route");
    for (let i = 0; i < 90; i++) {
      const res = await GET(new NextRequest(`http://localhost/api/ai/logs?n=${i}`));
      expect(res.status).toBe(200);
    }
    const bad = await GET(new NextRequest("http://localhost/api/ai/logs?last=1"));
    expect(bad.status).toBe(429);
  });
});
