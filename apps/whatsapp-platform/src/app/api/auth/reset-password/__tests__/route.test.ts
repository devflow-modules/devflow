import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: () => ({ ok: true }),
  getClientIp: () => "127.0.0.1",
}));

const mockVerifyToken = vi.fn();
const mockUpdatePassword = vi.fn();

const { mockRevokeAllSessionsForUser, mockFindUnique, mockSendTransactionalEmail } = vi.hoisted(() => ({
  mockRevokeAllSessionsForUser: vi.fn(),
  mockFindUnique: vi.fn(),
  mockSendTransactionalEmail: vi.fn(),
}));

vi.mock("@/modules/auth/sessionService", () => ({
  revokeAllSessionsForUser: mockRevokeAllSessionsForUser,
}));

vi.mock("@/modules/auth", () => ({
  verifyPasswordResetTokenResult: (...a: unknown[]) => mockVerifyToken(...a),
  updateUserPassword: (...a: unknown[]) => mockUpdatePassword(...a),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
    },
  },
}));

vi.mock("@/modules/email/application/sendTransactionalEmail", () => ({
  sendTransactionalEmail: (...a: unknown[]) => mockSendTransactionalEmail(...a),
}));

vi.mock("@/lib/auth-logger", () => ({
  logAuth: vi.fn(),
}));

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRevokeAllSessionsForUser.mockResolvedValue(undefined);
    mockFindUnique.mockResolvedValue({
      email: "a@b.com",
      name: "Tester",
      tenantId: "t1",
    });
    mockSendTransactionalEmail.mockResolvedValue({ ok: true, provider: "resend" });
  });

  it("400 quando JSON inválido", async () => {
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/api/auth/reset-password", {
      method: "POST",
      body: "oops",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("400 quando token inválido", async () => {
    mockVerifyToken.mockResolvedValue({ ok: false, reason: "invalid" as const });
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token: "bad", newPassword: "12345678" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("RESET_TOKEN_INVALID");
  });

  it("400 quando token expirado", async () => {
    mockVerifyToken.mockResolvedValue({ ok: false, reason: "expired" as const });
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token: "exp", newPassword: "12345678" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("RESET_TOKEN_EXPIRED");
  });

  it("200 quando senha atualizada", async () => {
    mockVerifyToken.mockResolvedValue({
      ok: true,
      payload: { sub: "u1", email: "a@b.com" },
    });
    mockUpdatePassword.mockResolvedValue(true);
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token: "good", newPassword: "12345678" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpdatePassword).toHaveBeenCalledWith("u1", "12345678");
    expect(mockRevokeAllSessionsForUser).toHaveBeenCalledWith("u1");
    expect(mockSendTransactionalEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "PASSWORD_CHANGED",
        to: "a@b.com",
        userId: "u1",
        tenantId: "t1",
      })
    );
  });
});
