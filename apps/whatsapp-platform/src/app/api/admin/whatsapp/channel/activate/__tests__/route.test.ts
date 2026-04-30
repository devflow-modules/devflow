import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import type { AuthResult } from "@/modules/auth";
import { WhatsappPhoneNumberStatus } from "@/generated/prisma-whatsapp";

const mockActivate = vi.fn();
const mockGate = vi.fn();

vi.mock("@/lib/adminApiAuth", () => ({
  gatePlatformAdminOrProvisionSecret: (...a: unknown[]) => mockGate(...a),
}));

vi.mock("@/lib/platformAuditLog", () => ({
  recordPlatformAudit: vi.fn(),
}));

vi.mock("@/modules/whatsapp/whatsappChannelLifecycle", () => ({
  activateWhatsappChannel: (...a: unknown[]) => mockActivate(...a),
}));

const gateOkPlatform: AuthResult = {
  payload: {
    sub: "u1",
    tenantId: "t1",
    role: "platform_admin",
    email: "a@b.c",
    name: "A",
    jti: "jid",
    iat: 1,
    exp: 9999999999,
  },
  token: "tok",
  sessionId: "jid",
};

describe("P0 — POST /api/admin/whatsapp/channel/activate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGate.mockResolvedValue({ ok: true, auth: gateOkPlatform, viaProvisionSecret: false });
  });

  it("401 sem autorização", async () => {
    mockGate.mockResolvedValue({
      ok: false,
      response: new NextResponse(JSON.stringify({ error: "UNAUTHORIZED" }), { status: 401 }),
    });
    const { POST } = await import("../route");
    const res = await POST(
      new NextRequest("http://localhost/api/admin/whatsapp/channel/activate", {
        method: "POST",
        body: JSON.stringify({ channelId: "c1", accessToken: "12345678901" }),
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(res.status).toBe(401);
    expect(mockActivate).not.toHaveBeenCalled();
  });

  it("200 PENDING → ACTIVE: devolve status ACTIVE após activateWhatsappChannel", async () => {
    mockActivate.mockResolvedValue({
      id: "chan-1",
      tenantId: "t1",
      phoneNumberId: "pn1",
      status: WhatsappPhoneNumberStatus.ACTIVE,
    });
    const { POST } = await import("../route");
    const res = await POST(
      new NextRequest("http://localhost/api/admin/whatsapp/channel/activate", {
        method: "POST",
        body: JSON.stringify({ channelId: "chan-1", accessToken: "12345678901" }),
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(res.status).toBe(200);
    const j = (await res.json()) as { success: boolean; data: { status: string } };
    expect(j.success).toBe(true);
    expect(j.data.status).toBe("ACTIVE");
    expect(mockActivate).toHaveBeenCalledWith(
      expect.objectContaining({ channelId: "chan-1", accessToken: "12345678901" })
    );
  });

  it("404 quando activateWhatsappChannel lança CHANNEL_NOT_FOUND", async () => {
    mockActivate.mockRejectedValue(new Error("CHANNEL_NOT_FOUND"));
    const { POST } = await import("../route");
    const res = await POST(
      new NextRequest("http://localhost/api/admin/whatsapp/channel/activate", {
        method: "POST",
        body: JSON.stringify({ channelId: "missing", accessToken: "12345678901" }),
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(res.status).toBe(404);
  });
});
