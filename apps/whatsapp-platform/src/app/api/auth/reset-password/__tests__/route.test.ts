import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: () => ({ ok: true }),
  getClientIp: () => "127.0.0.1",
}));

const mockVerifyToken = vi.fn();
const mockUpdatePassword = vi.fn();

vi.mock("@/modules/auth", () => ({
  verifyPasswordResetToken: (...a: unknown[]) => mockVerifyToken(...a),
  updateUserPassword: (...a: unknown[]) => mockUpdatePassword(...a),
}));

vi.mock("@/lib/auth-logger", () => ({
  logAuth: vi.fn(),
}));

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    mockVerifyToken.mockResolvedValue(null);
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token: "bad", newPassword: "12345678" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("200 quando senha atualizada", async () => {
    mockVerifyToken.mockResolvedValue({ sub: "u1", email: "a@b.com" });
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
  });
});
