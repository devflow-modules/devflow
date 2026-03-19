import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockGetRevenueMetrics = vi.fn();
vi.mock("@/modules/analytics", () => ({
  getRevenueMetrics: (...args: unknown[]) => mockGetRevenueMetrics(...args),
}));

describe("GET /api/admin/metrics/revenue", () => {
  const origNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    process.env.NODE_ENV = origNodeEnv;
  });

  it("retorna 403 sem permissão em produção", async () => {
    process.env.NODE_ENV = "production";
    process.env.ADMIN_METRICS_SECRET = "secret123";
    const { GET } = await import("../route");
    const res = await GET(new Request("http://localhost/api/admin/metrics/revenue"));
    expect(res.status).toBe(403);
  });

  it("retorna métricas de receita quando autorizado", async () => {
    mockGetRevenueMetrics.mockResolvedValue({
      mrr: 100,
      arr: 1200,
      arpu: 50,
      churnRate: 5,
      activeSubscriptions: 2,
      canceledInPeriod: 0,
      totalTenants: 10,
    });
    const { GET } = await import("../route");
    const res = await GET(new Request("http://localhost/api/admin/metrics/revenue"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.mrr).toBe(100);
    expect(body.arr).toBe(1200);
    expect(body.arpu).toBe(50);
    expect(body.churnRate).toBe(5);
  });

  it("retorna 500 em erro do serviço", async () => {
    mockGetRevenueMetrics.mockRejectedValue(new Error("DB"));
    const { GET } = await import("../route");
    const res = await GET(new Request("http://localhost/api/admin/metrics/revenue"));
    expect(res.status).toBe(500);
  });
});
