import { describe, it, expect, vi, beforeEach } from "vitest";

const mockListTenants = vi.fn();
const mockListConversations = vi.fn();
const mockListConversationsByStatus = vi.fn();
const mockGetLastMessageForConversationIds = vi.fn();

vi.mock("@/lib/supabase-server", () => ({ hasSupabaseConfig: vi.fn(() => true) }));
vi.mock("@/modules/tenants", () => ({ listTenants: (...args: unknown[]) => mockListTenants(...args) }));
vi.mock("@/modules/conversations", () => ({
  listConversations: (...args: unknown[]) => mockListConversations(...args),
  listConversationsByStatus: (...args: unknown[]) => mockListConversationsByStatus(...args),
}));
vi.mock("@/modules/messaging", () => ({
  getLastMessageForConversationIds: (...args: unknown[]) => mockGetLastMessageForConversationIds(...args),
}));

describe("GET /api/admin/conversations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListTenants.mockResolvedValue([{ id: "t1" }]);
    mockListConversations.mockResolvedValue([
      { id: "c1", wa_from: "5511999999999", status: "open" },
    ]);
    mockListConversationsByStatus.mockResolvedValue([
      { id: "c2", wa_from: "5511888888888", status: "waiting_queue" },
    ]);
    mockGetLastMessageForConversationIds.mockResolvedValue(
      new Map([["c1", { body: "Oi", created_at: "2025-01-01T12:00:00Z" }]])
    );
  });

  it("retorna conversas e total sem filtro de status", async () => {
    const { GET } = await import("../route");
    const req = new Request("http://localhost/api/admin/conversations");
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.conversations).toBeDefined();
    expect(Array.isArray(data.conversations)).toBe(true);
    expect(data.total).toBeGreaterThanOrEqual(0);
    expect(mockListConversations).toHaveBeenCalledWith("t1", 100);
  });

  it("filtra por status quando query status=waiting_queue", async () => {
    const { GET } = await import("../route");
    const req = new Request("http://localhost/api/admin/conversations?status=waiting_queue");
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    expect(mockListConversationsByStatus).toHaveBeenCalledWith("t1", "waiting_queue", 100);
  });
});
