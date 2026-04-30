import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AuthResult } from "@/modules/auth";
import { jsonError } from "@/lib/api-response";

const mockGetRevenueMetrics = vi.fn();
const mockGatePlatformAdminJwt = vi.fn();

vi.mock("@/modules/analytics", () => ({
  getRevenueMetrics: (...args: unknown[]) => mockGetRevenueMetrics(...args),
}));

vi.mock("@/lib/adminApiAuth", () => ({
  gatePlatformAdminJwt: (...args: unknown[]) => mockGatePlatformAdminJwt(...args),
}));

/** NODE_ENV é read-only em ProcessEnv (TypeScript); testes usam atribuição ampla. */
function setEnv(key: string, value: string | undefined) {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env[key];
  else env[key] = value;
}

const adminAuth = {
  ok: true as const,
  auth: {
    payload: {
      sub: "u-admin",
      tenantId: "t1",
      role: "platform_admin" as const,
      email: "a@b.c",
      name: "A",
      jti: "j1",
      iat: 1,
      exp: 9999999999,
    },
    token: "t",
    sessionId: "j1",
  } satisfies AuthResult,
};

describe("GET /api/admin/metrics/revenue", () => {
  const origNodeEnv = process.env.NODE_ENV;
  const origAdminSecret = process.env.ADMIN_METRICS_SECRET;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockGatePlatformAdminJwt.mockResolvedValue(adminAuth);
    setEnv("NODE_ENV", "development");
  });

  afterEach(() => {
    setEnv("NODE_ENV", origNodeEnv);
    setEnv("ADMIN_METRICS_SECRET", origAdminSecret);
  });

  it("401 sem sessão (gate)", async () => {
    mockGatePlatformAdminJwt.mockResolvedValue({
      ok: false,
      response: jsonError("UNAUTHORIZED", "Não autorizado.", 401, { traceId: "t1" }),
    });
    setEnv("NODE_ENV", "production");
    setEnv("ADMIN_METRICS_SECRET", "secret123");
    const { GET } = await import("../route");
    const res = await GET(new Request("http://localhost/api/admin/metrics/revenue") as never);
    expect(res.status).toBe(401);
  });

  it("403 quando papel não é platform_admin", async () => {
    mockGatePlatformAdminJwt.mockResolvedValue({
      ok: false,
      response: jsonError("FORBIDDEN", "Acesso negado.", 403, { traceId: "t2" }),
    });
    const { GET } = await import("../route");
    const res = await GET(new Request("http://localhost/api/admin/metrics/revenue") as never);
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
    const res = await GET(new Request("http://localhost/api/admin/metrics/revenue") as never);
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
    const res = await GET(new Request("http://localhost/api/admin/metrics/revenue") as never);
    expect(res.status).toBe(500);
  });
});
