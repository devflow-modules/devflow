import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetAuth = vi.fn();
const mockGetDiagnostics = vi.fn();
const mockSendNotification = vi.fn();

vi.mock("@/modules/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/auth")>();
  return {
    ...actual,
    getAuthFromRequest: (...a: unknown[]) => mockGetAuth(...a),
  };
});

vi.mock("@/modules/support/getSupportDiagnostics", () => ({
  getSupportDiagnostics: (...a: unknown[]) => mockGetDiagnostics(...a),
}));

vi.mock("@/modules/support/sendSupportNotification", () => ({
  sendSupportNotification: (...a: unknown[]) => mockSendNotification(...a),
}));

describe("POST /api/support/report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuth.mockResolvedValue({
      payload: {
        sub: "u1",
        email: "a@b.com",
        name: "A",
        role: "admin",
        tenantId: "t1",
        jti: "jti",
      },
      token: "tok",
      sessionId: "sid",
    });
    mockGetDiagnostics.mockResolvedValue({
      activationComplete: true,
      phoneConnected: true,
      promptReady: true,
      apiKeyReady: true,
      phoneNumberId: "pn",
      displayPhoneNumber: "+1",
      lineStatus: "ACTIVE",
      threadCount: 0,
      recentMessagesCount: 0,
    });
    mockSendNotification.mockResolvedValue({ ok: true, emailSent: true, webhookSent: false });
  });

  it("401 sem sessão", async () => {
    mockGetAuth.mockResolvedValueOnce(null);
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/api/support/report", {
      method: "POST",
      body: JSON.stringify({ category: "question", description: "x" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("400 quando descrição vazia", async () => {
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/api/support/report", {
      method: "POST",
      body: JSON.stringify({ category: "question", description: "" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("200 com debugIdDisplay", async () => {
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/api/support/report", {
      method: "POST",
      body: JSON.stringify({
        category: "platform_error",
        description: "Falha ao abrir",
        pathname: "/dashboard",
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { debugId: string; debugIdDisplay: string };
    expect(json.debugId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(json.debugIdDisplay).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
  });

  it("503 quando notificação falha", async () => {
    mockSendNotification.mockResolvedValueOnce({ ok: false, reason: "x" });
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/api/support/report", {
      method: "POST",
      body: JSON.stringify({ category: "other", description: "texto" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
  });
});
