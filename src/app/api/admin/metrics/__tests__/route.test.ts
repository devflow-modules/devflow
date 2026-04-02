import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/metrics/financeMetrics", () => ({
  getCounters: vi.fn(),
}));

vi.mock("@/analytics/growth/growthMetrics", () => ({
  getCounters: vi.fn(),
}));

import { getCounters as getFinanceCounters } from "@/lib/metrics/financeMetrics";
import { getCounters as getGrowthCounters } from "@/analytics/growth/growthMetrics";
import { GET } from "../route";

describe("GET /api/admin/metrics", () => {
  const mockFinance = {
    "finance.tool.expenses.usage": 10,
    "finance.feature.rules.created": 5,
  };
  const mockGrowth = {
    "devflow.visitors.count": 100,
    "devflow.leads.submitted": 20,
  };

  beforeEach(() => {
    vi.mocked(getFinanceCounters).mockReturnValue({ ...mockFinance });
    vi.mocked(getGrowthCounters).mockReturnValue({ ...mockGrowth });
    process.env.ADMIN_METRICS_SECRET = "test-secret";
  });

  it("retorna 403 quando não autorizado", async () => {
    process.env.ADMIN_METRICS_SECRET = undefined;
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const req = new Request("http://localhost/api/admin/metrics");
    const res = await GET(req);
    process.env.NODE_ENV = prev;

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("retorna métricas de finance e growth com header de secret", async () => {
    const req = new Request("http://localhost/api/admin/metrics", {
      headers: { "x-admin-metrics-secret": "test-secret" },
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.finance).toBeDefined();
    expect(body.finance.metrics).toEqual(mockFinance);
    expect(body.growth).toBeDefined();
    expect(body.growth.metrics).toEqual(mockGrowth);
  });

  it("retorna formato correto { finance: { metrics }, growth: { metrics } }", async () => {
    const req = new Request("http://localhost/api/admin/metrics", {
      headers: { "x-admin-metrics-secret": "test-secret" },
    });
    const res = await GET(req);
    const body = await res.json();

    expect(body).toHaveProperty("finance");
    expect(body.finance).toHaveProperty("metrics");
    expect(typeof body.finance.metrics).toBe("object");
    expect(body).toHaveProperty("growth");
    expect(body.growth).toHaveProperty("metrics");
    expect(typeof body.growth.metrics).toBe("object");
  });
});
