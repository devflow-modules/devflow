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

function sampleThread() {
  const createdAt = new Date("2025-01-01T10:00:00Z");
  const lastMsgAt = new Date("2025-01-01T11:00:00Z");
  return {
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
  };
}

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
    mockFindNext.mockResolvedValue(sampleThread());
    const assignMod = await import("@/modules/inbox/threadAssignmentService");
    vi.spyOn(assignMod, "assignThread").mockResolvedValue({ ok: true, changed: true });
    const { GET } = await import("../route");
    const req = new NextRequest("http://localhost/api/inbox/queue/next");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const j = (await res.json()) as { success: boolean; data: { thread: { id: string } } };
    expect(j.success).toBe(true);
    expect(j.data.thread.id).toBe("th1");
    expect(assignMod.assignThread).toHaveBeenCalledWith("t1", "th1", "u1", "u1", "operator");
  });

  it("assign conflict → 409 sem thread no body", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t1", sub: "u2", role: "operator" },
    });
    mockFindNext.mockResolvedValue(sampleThread());
    const assignMod = await import("@/modules/inbox/threadAssignmentService");
    vi.spyOn(assignMod, "assignThread").mockResolvedValue({ ok: false, reason: "conflict" });
    const { GET } = await import("../route");
    const req = new NextRequest("http://localhost/api/inbox/queue/next");
    const res = await GET(req);
    expect(res.status).toBe(409);
    const j = (await res.json()) as {
      success: boolean;
      data: null;
      error: { code: string; message: string };
    };
    expect(j.success).toBe(false);
    expect(j.data).toBeNull();
    expect(j.error.code).toBe("queue_next_assign_conflict");
    expect(j.error.message).toMatch(/assumida por outro/i);
  });

  it("assign closed → 409 sem thread", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t1", sub: "u1", role: "operator" },
    });
    mockFindNext.mockResolvedValue(sampleThread());
    const assignMod = await import("@/modules/inbox/threadAssignmentService");
    vi.spyOn(assignMod, "assignThread").mockResolvedValue({ ok: false, reason: "closed" });
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://localhost/api/inbox/queue/next"));
    expect(res.status).toBe(409);
    const j = (await res.json()) as { success: boolean; data: null };
    expect(j.success).toBe(false);
    expect(j.data).toBeNull();
  });

  it("assign not_found → 404 sem thread", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t1", sub: "u1", role: "operator" },
    });
    mockFindNext.mockResolvedValue(sampleThread());
    const assignMod = await import("@/modules/inbox/threadAssignmentService");
    vi.spyOn(assignMod, "assignThread").mockResolvedValue({ ok: false, reason: "not_found" });
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://localhost/api/inbox/queue/next"));
    expect(res.status).toBe(404);
    const j = (await res.json()) as { success: boolean; data: null };
    expect(j.success).toBe(false);
    expect(j.data).toBeNull();
  });
});
