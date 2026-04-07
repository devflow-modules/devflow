import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockGetRevenueMetrics = vi.fn();
vi.mock("@/modules/analytics", () => ({
  getRevenueMetrics: (...args: unknown[]) => mockGetRevenueMetrics(...args),
}));

/** NODE_ENV é read-only em ProcessEnv (TypeScript); testes usam atribuição ampla. */
function setEnv(key: string, value: string | undefined) {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env[key];
  else env[key] = value;
}

describe("GET /api/admin/metrics/revenue", () => {
  const origNodeEnv = process.env.NODE_ENV;
  const origAdminSecret = process.env.ADMIN_METRICS_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    setEnv("NODE_ENV", "development");
  });

  afterEach(() => {
    setEnv("NODE_ENV", origNodeEnv);
    setEnv("ADMIN_METRICS_SECRET", origAdminSecret);
  });

  it("retorna 403 sem permissão em produção", async () => {
    setEnv("NODE_ENV", "production");
    setEnv("ADMIN_METRICS_SECRET", "secret123");
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
