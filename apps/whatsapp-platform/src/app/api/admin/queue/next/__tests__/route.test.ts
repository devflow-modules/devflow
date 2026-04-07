import { describe, it, expect, vi, beforeEach } from "vitest";
import { WaInboxThreadStatus, WaInboxDirection } from "@/generated/prisma-whatsapp";

const mockGetAuthFromRequest = vi.fn();
const mockFindNext = vi.fn();
const mockThreadUpdate = vi.fn();
const mockAgentUpsert = vi.fn();

vi.mock("@/modules/auth", () => ({ getAuthFromRequest: (...args: unknown[]) => mockGetAuthFromRequest(...args) }));
vi.mock("@/modules/inbox/waInboxQueueService", () => ({
  findNextUnassignedQueueThread: (...args: unknown[]) => mockFindNext(...args),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    waInboxThread: { update: (...args: unknown[]) => mockThreadUpdate(...args) },
    agentStatus: { upsert: (...args: unknown[]) => mockAgentUpsert(...args) },
  },
}));

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

  it("retorna thread null quando fila vazia", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t1", sub: "u1" },
    });
    mockFindNext.mockResolvedValue(null);
    const { GET } = await import("../route");
    const req = new Request("http://localhost/api/admin/queue/next");
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.thread).toBeNull();
    expect(data.message).toContain("fila");
  });

  it("retorna próxima thread e atribui ao agente quando assign=true", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t1", sub: "u1" },
    });
    const createdAt = new Date("2025-01-01T10:00:00Z");
    const lastMsgAt = new Date("2025-01-01T11:00:00Z");
    mockFindNext.mockResolvedValue({
      id: "th1",
      tenantId: "t1",
      phoneNumber: "5511999999999",
      contactName: "Cliente",
      status: WaInboxThreadStatus.OPEN,
      lastMessageAt: lastMsgAt,
      createdAt,
      messages: [
        {
          id: "m1",
          direction: WaInboxDirection.INBOUND,
          contentText: "Oi",
          ts: lastMsgAt,
        },
      ],
    });
    mockThreadUpdate.mockResolvedValue({});
    mockAgentUpsert.mockResolvedValue({});
    const { GET } = await import("../route");
    const req = new Request("http://localhost/api/admin/queue/next");
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.thread).toBeDefined();
    expect(data.thread.id).toBe("th1");
    expect(mockThreadUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "th1", tenantId: "t1" },
        data: { assignedToUserId: "u1" },
      })
    );
    expect(mockAgentUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId_userId: { tenantId: "t1", userId: "u1" } },
        update: expect.objectContaining({ status: "busy", currentConversationId: "th1" }),
      })
    );
  });
});
