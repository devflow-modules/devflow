import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockAllowed = vi.fn();
const mockCounters = vi.fn();
const mockTenants = vi.fn();
const mockThreads = vi.fn();
const mockMsgs = vi.fn();

vi.mock("../adminAuth", () => ({
  isAdminMetricsAllowed: (...a: unknown[]) => mockAllowed(...a),
}));

vi.mock("@devflow/analytics-core", () => ({
  getCounters: () => mockCounters(),
}));

vi.mock("@/modules/inbox/waInboxOpsMetrics", () => ({
  countTenantsTotal: () => mockTenants(),
  countInboxThreadsTotal: () => mockThreads(),
}));

vi.mock("@/modules/messaging/waInboxMessageStats", () => ({
  countMessagesLast24h: () => mockMsgs(),
}));

describe("P1 — GET /api/admin/metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAllowed.mockReturnValue(true);
    mockCounters.mockReturnValue({ "whatsapp.webhook_received": 3 });
    mockTenants.mockResolvedValue(2);
    mockThreads.mockResolvedValue(5);
    mockMsgs.mockResolvedValue(12);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("403 quando isAdminMetricsAllowed é false (simula prod sem secret)", async () => {
    mockAllowed.mockReturnValue(false);
    vi.stubEnv("NODE_ENV", "production");
    const { GET } = await import("../route");
    const res = await GET(new Request("http://localhost/api/admin/metrics"));
    expect(res.status).toBe(403);
  });

  it("200 com forma esperada (métricas + ops + trace_id)", async () => {
    const { GET } = await import("../route");
    const res = await GET(new Request("http://localhost/api/admin/metrics"));
    expect(res.status).toBe(200);
    const j = (await res.json()) as {
      whatsapp_platform: { metrics: Record<string, number> };
      ops: { tenants: number; conversations: number; messagesLast24h: number };
      trace_id: string;
    };
    expect(j.whatsapp_platform.metrics["whatsapp.webhook_received"]).toBe(3);
    expect(j.ops).toEqual({ tenants: 2, conversations: 5, messagesLast24h: 12 });
    expect(typeof j.trace_id).toBe("string");
    expect(j.trace_id.length).toBeGreaterThan(4);
  });

  it("ops fica a zero quando contagens falham (não rebenta)", async () => {
    mockTenants.mockRejectedValue(new Error("db down"));
    mockThreads.mockRejectedValue(new Error("db down"));
    mockMsgs.mockRejectedValue(new Error("db down"));
    const { GET } = await import("../route");
    const res = await GET(new Request("http://localhost/api/admin/metrics"));
    expect(res.status).toBe(200);
    const j = (await res.json()) as { ops: { tenants: number; conversations: number; messagesLast24h: number } };
    expect(j.ops).toEqual({ tenants: 0, conversations: 0, messagesLast24h: 0 });
  });
});
