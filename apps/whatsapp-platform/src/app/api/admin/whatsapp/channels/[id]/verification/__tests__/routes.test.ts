import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { MetaBusinessVerificationStatus } from "@/generated/prisma-whatsapp";

const mockAuth = vi.fn();
const mockGet = vi.fn();
const mockUpdateChecklist = vi.fn();
const mockSetStatus = vi.fn();

vi.mock("../../../../provisionAuth", () => ({
  authorizeProvisionOrPlatformAdmin: (...a: unknown[]) => mockAuth(...a),
}));

vi.mock("@/modules/whatsapp/verificationService", () => ({
  getVerificationReadiness: (...a: unknown[]) => mockGet(...a),
  updateVerificationChecklist: (...a: unknown[]) => mockUpdateChecklist(...a),
  setVerificationStatus: (...a: unknown[]) => mockSetStatus(...a),
}));

const sampleDto = {
  channelId: "c1",
  status: MetaBusinessVerificationStatus.NOT_STARTED,
  checklist: {
    items: [
      { id: "business_profile", label: "Perfil", done: false },
      { id: "domain_or_website", label: "Domínio", done: false },
      { id: "legal_docs", label: "Docs", done: false },
      { id: "phone_match", label: "Telefone", done: false },
      { id: "two_factor", label: "2FA", done: false },
    ],
  },
  readinessScore: 0,
  suggestedStatus: null,
  verificationChecklistUpdatedAt: null,
  verificationReadyAt: null,
  verificationSubmittedAt: null,
  verificationApprovedAt: null,
  verificationRejectedAt: null,
};

describe("P0 — /api/admin/whatsapp/channels/:id/verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(true);
    mockGet.mockResolvedValue(sampleDto);
    mockUpdateChecklist.mockResolvedValue({ ...sampleDto, readinessScore: 20 });
    mockSetStatus.mockResolvedValue({
      ...sampleDto,
      status: MetaBusinessVerificationStatus.READY_FOR_SUBMISSION,
      readinessScore: 100,
    });
  });

  it("GET 401 sem auth", async () => {
    mockAuth.mockResolvedValue(false);
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://localhost/c1/verification"), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(401);
  });

  it("GET 200 devolve checklist, score e status", async () => {
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://localhost/c1/verification"), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(200);
    const j = (await res.json()) as { success: boolean; data: typeof sampleDto };
    expect(j.success).toBe(true);
    expect(j.data.channelId).toBe("c1");
    expect(j.data.readinessScore).toBe(0);
    expect(j.data.checklist.items.length).toBeGreaterThan(0);
    expect(mockGet).toHaveBeenCalledWith("c1");
  });

  it("POST checklist 200 e persiste updates", async () => {
    const { POST } = await import("../checklist/route");
    const res = await POST(
      new NextRequest("http://localhost/c1/verification/checklist", {
        method: "POST",
        body: JSON.stringify({ updates: { business_profile: true } }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "c1" }) }
    );
    expect(res.status).toBe(200);
    expect(mockUpdateChecklist).toHaveBeenCalledWith("c1", {
      updates: { business_profile: true },
    });
  });

  it("POST checklist 400 sem updates", async () => {
    const { POST } = await import("../checklist/route");
    const res = await POST(
      new NextRequest("http://localhost/c1/verification/checklist", {
        method: "POST",
        body: JSON.stringify({ updates: {} }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "c1" }) }
    );
    expect(res.status).toBe(400);
  });

  it("POST status 200 com action mark_ready", async () => {
    const { POST } = await import("../status/route");
    const res = await POST(
      new NextRequest("http://localhost/c1/verification/status", {
        method: "POST",
        body: JSON.stringify({ action: "mark_ready" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "c1" }) }
    );
    expect(res.status).toBe(200);
    expect(mockSetStatus).toHaveBeenCalledWith("c1", "mark_ready", { note: undefined });
  });

  it("POST status 400 com action inválida", async () => {
    const { POST } = await import("../status/route");
    const res = await POST(
      new NextRequest("http://localhost/c1/verification/status", {
        method: "POST",
        body: JSON.stringify({ action: "nope" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "c1" }) }
    );
    expect(res.status).toBe(400);
  });
});
