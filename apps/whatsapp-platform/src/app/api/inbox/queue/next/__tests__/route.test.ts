import { describe, it, expect, vi, beforeEach } from "vitest";
import { WaInboxThreadStatus, WaInboxDirection } from "@/generated/prisma-whatsapp";
import { NextRequest } from "next/server";

const mockGetAuthFromRequest = vi.fn();
const mockFindNext = vi.fn();
const mockGate = vi.fn();

vi.mock("@/modules/auth", async () => {
  const actual = await vi.importActual<typeof import("@/modules/auth")>("@/modules/auth");
  return {
    ...actual,
    getAuthFromRequest: (...args: unknown[]) => mockGetAuthFromRequest(...args),
  };
});
vi.mock("@/modules/inbox/waInboxQueueService", () => ({
  findNextUnassignedQueueThread: (...args: unknown[]) => mockFindNext(...args),
}));
vi.mock("@/modules/billing/featureGate", () => ({
  requireFeatureOr403: (...args: unknown[]) => mockGate(...args),
}));

describe("GET /api/inbox/queue/next", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockGate.mockResolvedValue(null);
  });

  it("retorna 401 quando não autenticado", async () => {
    mockGetAuthFromRequest.mockResolvedValue(null);
    const { GET } = await import("../route");
    const req = new NextRequest("http://localhost/api/inbox/queue/next");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("when fila vazia, envelope success com thread null", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t1", sub: "u1", role: "operator" },
    });
    mockFindNext.mockResolvedValue(null);
    const { GET } = await import("../route");
    const req = new NextRequest("http://localhost/api/inbox/queue/next");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const j = (await res.json()) as { success: boolean; data: { thread: null } };
    expect(j.success).toBe(true);
    expect(j.data.thread).toBeNull();
  });

  it("when há thread com assign=true, atribui e devolve dados", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t1", sub: "u1", role: "operator" },
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
    const assignMod = await import("@/modules/inbox/threadAssignmentService");
    vi.spyOn(assignMod, "assignThread").mockResolvedValue(true);
    const { GET } = await import("../route");
    const req = new NextRequest("http://localhost/api/inbox/queue/next");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const j = (await res.json()) as { success: boolean; data: { thread: { id: string } } };
    expect(j.success).toBe(true);
    expect(j.data.thread.id).toBe("th1");
    expect(assignMod.assignThread).toHaveBeenCalledWith("t1", "th1", "u1", "u1");
  });
});
