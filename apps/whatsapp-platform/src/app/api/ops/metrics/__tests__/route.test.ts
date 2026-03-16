import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase-server", () => ({
  hasSupabaseConfig: vi.fn(),
}));
vi.mock("@/modules/tenants", () => ({ countTenants: vi.fn() }));
vi.mock("@/modules/conversations", () => ({ countConversations: vi.fn() }));
vi.mock("@/modules/messaging", () => ({ countMessagesLast24h: vi.fn() }));

describe("GET /api/ops/metrics", () => {
  beforeEach(async () => {
    vi.resetModules();
    const { hasSupabaseConfig } = await import("@/lib/supabase-server");
    vi.mocked(hasSupabaseConfig).mockReturnValue(false);
  });

  it("retorna payload com product e campos do contrato", async () => {
    const { GET } = await import("../route");
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.product).toBe("whatsapp-platform");
    expect(typeof data.users).toBe("number");
    expect(typeof data.activeSubscriptions).toBe("number");
    expect(typeof data.pendingCancellation).toBe("number");
    expect(typeof data.mrr).toBe("number");
    expect(typeof data.tenants).toBe("number");
    expect(typeof data.conversations).toBe("number");
    expect(typeof data.messagesLast24h).toBe("number");
  });

  it("retorna zeros quando Supabase não está configurado", async () => {
    const { GET } = await import("../route");
    const res = await GET();
    const data = await res.json();
    expect(data.tenants).toBe(0);
    expect(data.conversations).toBe(0);
    expect(data.messagesLast24h).toBe(0);
  });
});
