import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAuthFromRequest = vi.fn();
const mockListInboxThreadsCreatedInRange = vi.fn();

vi.mock("@/modules/auth", async () => {
  const actual = await vi.importActual<typeof import("@/modules/auth")>("@/modules/auth");
  return {
    ...actual,
    getAuthFromRequest: (...args: unknown[]) => mockGetAuthFromRequest(...args),
  };
});
vi.mock("@/modules/inbox/waInboxOpsMetrics", () => ({
  listInboxThreadsCreatedInRange: (...args: unknown[]) => mockListInboxThreadsCreatedInRange(...args),
}));

describe("GET /api/admin/export/conversations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthFromRequest.mockResolvedValue({
      payload: {
        sub: "u1",
        tenantId: "t1",
        role: "platform_admin",
        email: "a@b.c",
        name: "A",
        jti: "j1",
      },
      token: "x",
      sessionId: "j1",
    });
    mockListInboxThreadsCreatedInRange.mockResolvedValue([
      {
        id: "c1",
        phoneNumber: "5511999999999",
        status: "OPEN",
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
        updatedAt: new Date("2025-01-01T00:00:00.000Z"),
        lastMessageAt: new Date("2025-01-01T12:00:00.000Z"),
      },
    ]);
  });

  it("retorna 403 para manager", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: {
        sub: "u2",
        tenantId: "t1",
        role: "manager",
        email: "m@b.c",
        name: "M",
        jti: "j2",
      },
      token: "x",
      sessionId: "j2",
    });
    const { GET } = await import("../route");
    const req = new Request("http://localhost/api/admin/export/conversations");
    const res = await GET(req as never);
    expect(res.status).toBe(403);
  });

  it("retorna CSV com header e linhas", async () => {
    const { GET } = await import("../route");
    const req = new Request("http://localhost/api/admin/export/conversations");
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain("attachment");
    const text = await res.text();
    expect(text).toContain("id,wa_from,status,created_at");
    expect(text).toContain("c1");
  });

  it("retorna 401 quando não autenticado", async () => {
    mockGetAuthFromRequest.mockResolvedValue(null);
    const { GET } = await import("../route");
    const req = new Request("http://localhost/api/admin/export/conversations");
    const res = await GET(req as never);
    expect(res.status).toBe(401);
  });
});
