import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAuthFromRequest = vi.fn();
const mockListConversationsByDateRange = vi.fn();
const mockListMessagesInRange = vi.fn();

vi.mock("@/modules/auth", async () => {
  const actual = await vi.importActual<typeof import("@/modules/auth")>("@/modules/auth");
  return {
    ...actual,
    getAuthFromRequest: (...args: unknown[]) => mockGetAuthFromRequest(...args),
  };
});
vi.mock("@/lib/supabase-server", () => ({ hasSupabaseConfig: vi.fn(() => true) }));
vi.mock("@/modules/conversations", () => ({
  listConversationsByDateRange: (...args: unknown[]) => mockListConversationsByDateRange(...args),
}));
vi.mock("@/modules/messaging", () => ({
  listMessagesInRange: (...args: unknown[]) => mockListMessagesInRange(...args),
}));

describe("GET /api/admin/export/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthFromRequest.mockResolvedValue({ payload: { tenantId: "t1", role: "manager" } });
    mockListConversationsByDateRange.mockResolvedValue([{ id: "c1" }]);
    mockListMessagesInRange.mockResolvedValue([
      {
        id: "m1",
        conversation_id: "c1",
        direction: "inbound",
        body: "Oi",
        created_at: "2025-01-01T12:00:00Z",
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
    expect(text).toContain("id,conversation_id,direction,body,created_at");
    expect(text).toContain("m1");
  });
});
