import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAuthFromRequest = vi.fn();
const mockPrisma = {
  tenant: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock("@/modules/auth", () => ({ getAuthFromRequest: (...args: unknown[]) => mockGetAuthFromRequest(...args) }));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

const tenantRow = {
  id: "t1",
  name: "Tenant",
  aiDriver: "openAI",
  defaultPrompt: null,
  systemPrompt: null,
  apiKey: "key",
  plan: null,
  activeUntil: null,
  whatsappPhone: null,
};

describe("PATCH /api/tenants/me (aiDriver)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t1", sub: "u1", email: "a@b.com", name: "User", role: "admin" },
    });
    mockPrisma.tenant.findUnique.mockResolvedValue(tenantRow);
    mockPrisma.tenant.update.mockResolvedValue(tenantRow);
  });

  it("retorna 401 quando não autenticado", async () => {
    mockGetAuthFromRequest.mockResolvedValue(null);
    const { PATCH } = await import("../route");
    const req = new Request("http://localhost/api/tenants/me", {
      method: "PATCH",
      body: JSON.stringify({ aiDriver: "openAI" }),
    });
    const res = await PATCH(req as never);
    expect(res.status).toBe(401);
  });

  it("atualiza aiDriver e retorna 200", async () => {
    const { PATCH } = await import("../route");
    const req = new Request("http://localhost/api/tenants/me", {
      method: "PATCH",
      body: JSON.stringify({ aiDriver: "openAI" }),
    });
    const res = await PATCH(req as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.aiDriver).toBe("openAI");
    expect(mockPrisma.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "t1" },
        data: expect.objectContaining({ aiDriver: "openAI" }),
      })
    );
  });
});
