import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAuthFromRequest = vi.fn();
const mockListInboxMessagesCreatedInRange = vi.fn();

vi.mock("@/modules/auth", async () => {
  const actual = await vi.importActual<typeof import("@/modules/auth")>("@/modules/auth");
  return {
    ...actual,
    getAuthFromRequest: (...args: unknown[]) => mockGetAuthFromRequest(...args),
  };
});
vi.mock("@/modules/inbox/waInboxOpsMetrics", () => ({
  listInboxMessagesCreatedInRange: (...args: unknown[]) => mockListInboxMessagesCreatedInRange(...args),
}));

describe("GET /api/admin/export/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthFromRequest.mockResolvedValue({ payload: { tenantId: "t1", role: "manager" } });
    mockListInboxMessagesCreatedInRange.mockResolvedValue([
      {
        id: "m1",
        threadId: "c1",
        direction: "INBOUND",
        body: "Oi",
        createdAt: new Date("2025-01-01T12:00:00.000Z"),
      },
    ]);
  });

  it("retorna CSV de mensagens", async () => {
    const { GET } = await import("../route");
    const req = new Request("http://localhost/api/admin/export/messages");
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    const text = await res.text();
    expect(text).toContain("id,thread_id,direction,body,created_at");
    expect(text).toContain("m1");
  });
});
