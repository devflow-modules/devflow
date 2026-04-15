import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.hoisted(() => vi.fn());
const mockGetDetail = vi.hoisted(() => vi.fn());
const mockGetTimeline = vi.hoisted(() => vi.fn());

vi.mock("../../../provisionAuth", () => ({
  authorizeProvisionOrPlatformAdmin: (...a: unknown[]) => mockAuth(...a),
}));

vi.mock("@/modules/whatsapp/channelActivationService", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/modules/whatsapp/channelActivationService")>();
  return { ...mod, getChannelAdminDetail: mockGetDetail };
});

vi.mock("@/modules/whatsapp/channelEventService", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/modules/whatsapp/channelEventService")>();
  return { ...mod, getChannelTimeline: mockGetTimeline };
});

describe("GET /api/admin/whatsapp/channels/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(true);
  });

  it("401 quando não autorizado", async () => {
    mockAuth.mockResolvedValue(false);
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://localhost/api/admin/whatsapp/channels/x"), {
      params: Promise.resolve({ id: "x" }),
    });
    expect(res.status).toBe(401);
  });

  it("200 com detalhe incluindo lastEvent", async () => {
    mockGetDetail.mockResolvedValue({
      id: "c1",
      tenantId: "t1",
      phoneNumber: "+351",
      phoneNumberId: "pn1",
      tenantName: "Acme",
      status: "PENDING_ACTIVATION",
      createdAt: "2026-04-14T10:00:00.000Z",
      updatedAt: "2026-04-14T10:00:00.000Z",
      activatedAt: null,
      minutesInQueue: 42,
      slaStatus: "critical",
      possiblyStuck: true,
      lastEvent: { type: "ERROR", message: "Token inválido" },
      playbook: null,
      autoHealCandidate: false,
      autoHealAttempts: 0,
      autoHealStatus: "DISABLED",
      autoHealFeatureEnabled: true,
    });
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://localhost/api/admin/whatsapp/channels/c1"), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(200);
    const j = (await res.json()) as {
      success: boolean;
      data: { lastEvent: { type: string; message: string } };
    };
    expect(j.success).toBe(true);
    expect(j.data.lastEvent?.type).toBe("ERROR");
    expect(j.data.lastEvent?.message).toBe("Token inválido");
  });

  it("200 inclui playbook e autoHealCandidate quando presentes no serviço", async () => {
    mockGetDetail.mockResolvedValue({
      id: "c1",
      tenantId: "t1",
      phoneNumber: "+351",
      phoneNumberId: "pn1",
      tenantName: "Acme",
      status: "PENDING_ACTIVATION",
      createdAt: "2026-04-14T10:00:00.000Z",
      updatedAt: "2026-04-14T10:00:00.000Z",
      activatedAt: null,
      minutesInQueue: 42,
      slaStatus: "critical",
      possiblyStuck: false,
      lastEvent: { type: "ERROR", message: "invalid token" },
      playbook: {
        title: "Token inválido",
        steps: ["Passo 1"],
        errorType: "TOKEN_INVALID",
        cta: { label: "Tentar ativar de novo", action: "RETRY" },
      },
      autoHealCandidate: true,
      autoHealAttempts: 0,
      autoHealStatus: "ACTIVE",
      autoHealFeatureEnabled: true,
    });
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://localhost/api/admin/whatsapp/channels/c1"), {
      params: Promise.resolve({ id: "c1" }),
    });
    const j = (await res.json()) as {
      success: boolean;
      data: { playbook: { title: string } | null; autoHealCandidate: boolean };
    };
    expect(j.success).toBe(true);
    expect(j.data.playbook?.title).toBe("Token inválido");
    expect(j.data.autoHealCandidate).toBe(true);
  });
});

describe("GET /api/admin/whatsapp/channels/:id/timeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(true);
  });

  it("retorna eventos ordenados (serviço já aplica desc)", async () => {
    mockGetTimeline.mockResolvedValue([
      {
        id: "e2",
        channelId: "c1",
        type: "ACTIVATED",
        message: "ok",
        metadata: null,
        createdAt: "2026-04-14T12:00:00.000Z",
      },
      {
        id: "e1",
        channelId: "c1",
        type: "CHANNEL_CREATED",
        message: "criado",
        metadata: null,
        createdAt: "2026-04-14T11:00:00.000Z",
      },
    ]);
    const { GET } = await import("../timeline/route");
    const res = await GET(
      new NextRequest("http://localhost/api/admin/whatsapp/channels/c1/timeline"),
      { params: Promise.resolve({ id: "c1" }) }
    );
    expect(res.status).toBe(200);
    const j = (await res.json()) as { success: boolean; data: { events: { id: string }[] } };
    expect(j.success).toBe(true);
    expect(j.data.events[0]?.id).toBe("e2");
    expect(mockGetTimeline).toHaveBeenCalledWith("c1");
  });
});
