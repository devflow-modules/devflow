import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: () => ({ ok: true }),
  getClientIp: () => "127.0.0.1",
}));

const mockFindUser = vi.fn();
const mockSignToken = vi.fn();
const mockSendEmail = vi.fn();

vi.mock("@/modules/auth", () => ({
  findUserByEmail: (...a: unknown[]) => mockFindUser(...a),
  signPasswordResetToken: (...a: unknown[]) => mockSignToken(...a),
}));

vi.mock("@/lib/email", () => ({
  sendEmail: (...a: unknown[]) => mockSendEmail(...a),
  buildResetPasswordEmailHtml: () => "<p>reset</p>",
}));

vi.mock("@/lib/auth-logger", () => ({
  logAuth: vi.fn(),
}));

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_WHATSAPP_APP_URL = "http://localhost:3000";
    mockSignToken.mockResolvedValue("reset-jwt");
    mockSendEmail.mockResolvedValue({ ok: true });
  });

  it("400 quando JSON inválido", async () => {
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/api/auth/forgot-password", {
      method: "POST",
      body: "x",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("200 genérico quando e-mail não existe (sem vazar)", async () => {
    mockFindUser.mockResolvedValue(null);
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: "no@one.com" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("503 quando envio de e-mail falha", async () => {
    mockFindUser.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      tenantId: "t1",
      name: "A",
      passwordHash: "x",
      role: "admin",
    });
    mockSendEmail.mockResolvedValue({ ok: false, error: "smtp down" });
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: "a@b.com" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
  });
});
