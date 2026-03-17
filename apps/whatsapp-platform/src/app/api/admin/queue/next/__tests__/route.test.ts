import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAuthFromRequest = vi.fn();
const mockPrisma = {
  conversationQueue: { findFirst: vi.fn(), deleteMany: vi.fn() },
  agentStatus: { upsert: vi.fn() },
};

vi.mock("@/modules/auth", () => ({ getAuthFromRequest: (...args: unknown[]) => mockGetAuthFromRequest(...args) }));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

describe("GET /api/admin/queue/next", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 401 quando não autenticado", async () => {
    mockGetAuthFromRequest.mockResolvedValue(null);
    const { GET } = await import("../route");
    const req = new Request("http://localhost/api/admin/queue/next");
    const res = await GET(req as never);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Não autorizado");
  });

  it("retorna conversation null quando fila vazia", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t1", sub: "u1" },
    });
    mockPrisma.conversationQueue.findFirst.mockResolvedValue(null);
    const { GET } = await import("../route");
    const req = new Request("http://localhost/api/admin/queue/next");
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.conversation).toBeNull();
    expect(data.message).toContain("fila");
  });

  it("retorna próxima conversa e atribui ao agente quando assign=true", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t1", sub: "u1" },
    });
    mockPrisma.conversationQueue.findFirst.mockResolvedValue({
      conversationId: "c1",
      priority: 0,
      queuedAt: new Date(),
      conversation: {
        id: "c1",
        externalId: "5511999999999",
        tenantId: "t1",
        createdAt: new Date(),
        messages: [],
      },
    });
    mockPrisma.conversationQueue.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.agentStatus.upsert.mockResolvedValue({});
    const { GET } = await import("../route");
    const req = new Request("http://localhost/api/admin/queue/next");
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.conversation).toBeDefined();
    expect(data.conversation.id).toBe("c1");
    expect(mockPrisma.agentStatus.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId_userId: { tenantId: "t1", userId: "u1" } },
        update: expect.objectContaining({ status: "busy", currentConversationId: "c1" }),
      })
    );
  });
});
