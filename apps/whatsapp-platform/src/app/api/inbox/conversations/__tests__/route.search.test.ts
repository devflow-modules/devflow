import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockList = vi.fn();
const mockCount = vi.fn();
const mockLines = vi.fn();

vi.mock("@/modules/inbox", () => ({
  waInboxListThreads: (...args: unknown[]) => mockList(...args),
  waInboxCountThreads: (...args: unknown[]) => mockCount(...args),
  fetchWhatsappLineSummaries: (...args: unknown[]) => mockLines(...args),
}));

const mockAuth = vi.fn();
vi.mock("@/modules/auth", () => ({
  getAuthFromRequest: (...args: unknown[]) => mockAuth(...args),
}));

vi.mock("@/lib/devflowProspecting", () => ({
  isDevFlowProspectingEnabled: () => false,
}));

describe("GET /api/inbox/conversations — search (q)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      payload: { tenantId: "tenant-a", sub: "user-1", role: "operator" },
    });
    mockList.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);
    mockLines.mockResolvedValue([]);
  });

  it("401 sem sessão", async () => {
    mockAuth.mockResolvedValue(null);
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://localhost/api/inbox/conversations?q=Maria"));
    expect(res.status).toBe(401);
    expect(mockList).not.toHaveBeenCalled();
  });

  it("passa search e tenant ao listar (nome)", async () => {
    const { GET } = await import("../route");
    const res = await GET(
      new NextRequest(
        "http://localhost/api/inbox/conversations?phase=needs_response&q=Maria&limit=50"
      )
    );
    expect(res.status).toBe(200);
    expect(mockList).toHaveBeenCalledWith(
      "tenant-a",
      expect.objectContaining({
        take: 50,
        skip: 0,
        currentUserId: "user-1",
        filters: expect.objectContaining({
          conversationPhase: "needs_response",
          search: "Maria",
        }),
      })
    );
    expect(mockCount).toHaveBeenCalledWith(
      "tenant-a",
      expect.objectContaining({ search: "Maria", conversationPhase: "needs_response" }),
      "user-1"
    );
  });

  it("passa telefone e fase closed do histórico sem misturar needs_response", async () => {
    const { GET } = await import("../route");
    await GET(
      new NextRequest(
        "http://localhost/api/inbox/conversations?phase=closed&q=5511999887766&limit=100"
      )
    );
    expect(mockList).toHaveBeenCalledWith(
      "tenant-a",
      expect.objectContaining({
        filters: expect.objectContaining({
          conversationPhase: "closed",
          search: "5511999887766",
        }),
      })
    );
  });

  it("trunca q a 120 e ignora fase desconhecida (fail-closed para phase)", async () => {
    const { GET } = await import("../route");
    const long = "m".repeat(200);
    await GET(
      new NextRequest(
        `http://localhost/api/inbox/conversations?phase=not_a_phase&q=${encodeURIComponent(long)}`
      )
    );
    const call = mockList.mock.calls[0]?.[1] as {
      filters?: { search?: string; conversationPhase?: string };
    };
    expect(call.filters?.search?.length).toBe(120);
    expect(call.filters?.conversationPhase).toBeUndefined();
  });

  it("limita pagination take a 200", async () => {
    const { GET } = await import("../route");
    await GET(new NextRequest("http://localhost/api/inbox/conversations?limit=999&q=ok"));
    expect(mockList.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ take: 200 })
    );
  });

  it("outro tenant não reutiliza auth de tenant-a", async () => {
    mockAuth.mockResolvedValue({
      payload: { tenantId: "tenant-b", sub: "user-b", role: "operator" },
    });
    const { GET } = await import("../route");
    await GET(new NextRequest("http://localhost/api/inbox/conversations?q=segredo"));
    expect(mockList).toHaveBeenCalledWith("tenant-b", expect.any(Object));
    expect(mockList).not.toHaveBeenCalledWith("tenant-a", expect.any(Object));
  });
});
