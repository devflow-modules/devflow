import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetAuthFromRequest = vi.fn();
const mockGetManagerDashboard = vi.fn();
const mockQueueFindFirst = vi.fn();
const mockPhoneNumberFindFirst = vi.fn();

vi.mock("@/modules/auth", async () => {
  const actual = await vi.importActual<typeof import("@/modules/auth")>("@/modules/auth");
  return {
    ...actual,
    getAuthFromRequest: (...args: unknown[]) => mockGetAuthFromRequest(...args),
  };
});

vi.mock("@/modules/metrics/managerDashboardService", () => ({
  getManagerDashboard: (...args: unknown[]) => mockGetManagerDashboard(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    waInboxQueue: {
      findFirst: (...args: unknown[]) => mockQueueFindFirst(...args),
    },
    whatsappPhoneNumber: {
      findFirst: (...args: unknown[]) => mockPhoneNumberFindFirst(...args),
    },
  },
}));

const samplePayload = {
  range: { dateFrom: "2026-01-01T00:00:00.000Z", dateTo: "2026-01-31T00:00:00.000Z" },
  operation: { awaiting: 2, unassigned: 1, critical: 0, avgFirstResponseMs: 120_000 },
  team: {
    handled: 5,
    avgResponseMs: 60_000,
    avgFirstResponseMs: 90_000,
    closed: 3,
    agents: [],
  },
  automation: {
    autoRate: 0.4,
    resolvedByAiRate: 0.1,
    fallbackRate: 0.2,
    playbookUsageRate: 0.05,
    followUpUsageRate: 0.02,
  },
  funnel: {
    lead: 1,
    qualified: 0,
    proposal: 0,
    followUp: 0,
    closed: 0,
    lost: 0,
  },
};

describe("GET /api/metrics/manager-dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t1", sub: "u1", email: "a@b.com", name: "User", role: "manager" },
    });
    mockGetManagerDashboard.mockResolvedValue(samplePayload);
    mockQueueFindFirst.mockResolvedValue({ id: "q-sales" });
    mockPhoneNumberFindFirst.mockResolvedValue({ id: "line-1" });
  });

  it("retorna 401 quando não autenticado", async () => {
    mockGetAuthFromRequest.mockResolvedValue(null);
    const { GET } = await import("../route");
    const res = await GET(
      new NextRequest(new URL("http://localhost/api/metrics/manager-dashboard")) as never
    );
    expect(res.status).toBe(401);
  });

  it("retorna 403 quando operador", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t1", sub: "u1", email: "a@b.com", name: "User", role: "operator" },
    });
    const { GET } = await import("../route");
    const res = await GET(
      new NextRequest(new URL("http://localhost/api/metrics/manager-dashboard")) as never
    );
    expect(res.status).toBe(403);
  });

  it("retorna 200 com payload do serviço", async () => {
    const { GET } = await import("../route");
    const res = await GET(
      new NextRequest(new URL("http://localhost/api/metrics/manager-dashboard")) as never
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.operation.awaiting).toBe(2);
    expect(json.team.handled).toBe(5);
    expect(json.funnel.lead).toBe(1);
    expect(mockGetManagerDashboard).toHaveBeenCalledWith("t1", undefined);
  });

  it("propaga dateFrom/dateTo ao serviço", async () => {
    const { GET } = await import("../route");
    const url = new URL("http://localhost/api/metrics/manager-dashboard");
    url.searchParams.set("dateFrom", "2026-02-01T00:00:00.000Z");
    url.searchParams.set("dateTo", "2026-02-28T00:00:00.000Z");
    const res = await GET(new NextRequest(url) as never);
    expect(res.status).toBe(200);
    expect(mockGetManagerDashboard).toHaveBeenCalledWith(
      "t1",
      expect.objectContaining({
        dateFrom: expect.any(Date),
        dateTo: expect.any(Date),
      })
    );
  });

  it("propaga queueId + businessPhoneNumberId ao serviço", async () => {
    const { GET } = await import("../route");
    const url = new URL("http://localhost/api/metrics/manager-dashboard");
    url.searchParams.set("queueId", "q-sales");
    url.searchParams.set("businessPhoneNumberId", "line-prospeccao");
    const res = await GET(new NextRequest(url) as never);
    expect(res.status).toBe(200);
    expect(mockGetManagerDashboard).toHaveBeenCalledWith(
      "t1",
      expect.objectContaining({
        queueId: "q-sales",
        businessPhoneNumberId: "line-prospeccao",
      })
    );
  });

  it("retorna 200 para platform_admin", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t1", sub: "u1", email: "a@b.com", name: "User", role: "platform_admin" },
    });
    const { GET } = await import("../route");
    const res = await GET(
      new NextRequest(new URL("http://localhost/api/metrics/manager-dashboard")) as never
    );
    expect(res.status).toBe(200);
  });

  it("retorna 403 quando queueId não pertence ao tenant", async () => {
    mockQueueFindFirst.mockResolvedValue(null);
    const { GET } = await import("../route");
    const url = new URL("http://localhost/api/metrics/manager-dashboard");
    url.searchParams.set("queueId", "queue-foreign");
    const res = await GET(new NextRequest(url) as never);
    expect(res.status).toBe(403);
    expect(mockGetManagerDashboard).not.toHaveBeenCalled();
  });

  it("retorna 403 quando businessPhoneNumberId não pertence ao tenant", async () => {
    mockPhoneNumberFindFirst.mockResolvedValue(null);
    const { GET } = await import("../route");
    const url = new URL("http://localhost/api/metrics/manager-dashboard");
    url.searchParams.set("businessPhoneNumberId", "line-foreign");
    const res = await GET(new NextRequest(url) as never);
    expect(res.status).toBe(403);
    expect(mockGetManagerDashboard).not.toHaveBeenCalled();
  });
});
