import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { WhatsappPhoneNumberStatus } from "@/generated/prisma-whatsapp";

const mockAuth = vi.fn();
const mockActivate = vi.fn();

vi.mock("../../../provisionAuth", () => ({
  authorizeProvisionOrPlatformAdmin: (...a: unknown[]) => mockAuth(...a),
}));

vi.mock("@/modules/whatsapp/whatsappChannelLifecycle", () => ({
  activateWhatsappChannel: (...a: unknown[]) => mockActivate(...a),
}));

describe("P0 — POST /api/admin/whatsapp/channel/activate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(true);
  });

  it("401 sem autorização", async () => {
    mockAuth.mockResolvedValue(false);
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
