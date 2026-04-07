import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAuthFromRequest = vi.fn();
const mockListConversationsByDateRange = vi.fn();

vi.mock("@/modules/auth", () => ({
  getAuthFromRequest: (...args: unknown[]) => mockGetAuthFromRequest(...args),
  requireRole: () => null,
}));
vi.mock("@/lib/supabase-server", () => ({ hasSupabaseConfig: vi.fn(() => true) }));
vi.mock("@/modules/conversations", () => ({
  listConversationsByDateRange: (...args: unknown[]) => mockListConversationsByDateRange(...args),
}));

describe("GET /api/admin/export/conversations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthFromRequest.mockResolvedValue({ payload: { tenantId: "t1" } });
    mockListConversationsByDateRange.mockResolvedValue([
      {
        id: "c1",
        wa_from: "5511999999999",
        status: "open",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
        last_message_at: "2025-01-01T12:00:00Z",
      },
    ]);
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
