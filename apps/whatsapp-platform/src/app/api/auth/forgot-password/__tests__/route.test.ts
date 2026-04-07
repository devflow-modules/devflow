import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: () => ({ ok: true }),
  getClientIp: () => "127.0.0.1",
}));

const mockFindUser = vi.fn();
const mockSignToken = vi.fn();
const mockSendTransactionalEmail = vi.fn();

vi.mock("@/modules/auth", () => ({
  findUserByEmail: (...a: unknown[]) => mockFindUser(...a),
  signPasswordResetToken: (...a: unknown[]) => mockSignToken(...a),
}));

vi.mock("@/modules/email/application/sendTransactionalEmail", () => ({
  sendTransactionalEmail: (...a: unknown[]) => mockSendTransactionalEmail(...a),
}));

vi.mock("@/lib/auth-logger", () => ({
  logAuth: vi.fn(),
}));

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_WHATSAPP_APP_URL = "http://localhost:3000";
    mockSignToken.mockResolvedValue("reset-jwt");
    mockSendTransactionalEmail.mockResolvedValue({ ok: true, provider: "resend" });
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
    expect(mockSendTransactionalEmail).not.toHaveBeenCalled();
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
    mockSendTransactionalEmail.mockResolvedValue({
      ok: false,
      provider: "resend",
      errorCode: "EMAIL_SEND_FAILED",
    });
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: "a@b.com" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  it("503 e EMAIL_NOT_CONFIGURED quando infra de e-mail não está configurada", async () => {
    mockFindUser.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      tenantId: "t1",
      name: "A",
      passwordHash: "x",
      role: "admin",
    });
    mockSendTransactionalEmail.mockResolvedValue({
      ok: false,
      provider: "resend",
      errorCode: "EMAIL_NOT_CONFIGURED",
      errorMessage: "RESEND_API_KEY não configurada",
    });
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: "a@b.com" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
    const body = (await res.json()) as { code?: string; error?: string };
    expect(body.code).toBe("EMAIL_NOT_CONFIGURED");
    expect(body.error).toContain("não está configurado");
    expect(body.error).toMatch(/RESEND_API_KEY|EMAIL_FROM|RESEND_FROM/);
    expect(body.error).not.toMatch(/re_[a-z0-9]+/i);
  });
});
