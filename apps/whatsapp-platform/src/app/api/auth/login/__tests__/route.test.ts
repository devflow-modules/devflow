import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockLogin = vi.fn();
const mockSignToken = vi.fn();
const mockBuildSetCookieHeader = vi.fn();
const mockLogAuth = vi.fn();

const { mockCreateUserSession } = vi.hoisted(() => ({
  mockCreateUserSession: vi.fn(),
}));

vi.mock("@/modules/auth/sessionService", () => ({
  createUserSession: mockCreateUserSession,
}));

vi.mock("@/modules/auth", () => ({
  login: (...a: unknown[]) => mockLogin(...a),
  signToken: (...a: unknown[]) => mockSignToken(...a),
  buildSetCookieHeader: (...a: unknown[]) => mockBuildSetCookieHeader(...a),
}));

vi.mock("@/lib/auth-logger", () => ({
  logAuth: (...a: unknown[]) => mockLogAuth(...a),
}));

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateUserSession.mockResolvedValue({ sessionId: "sess-1", expiresAt: new Date() });
    mockSignToken.mockResolvedValue("jwt-token");
    mockBuildSetCookieHeader.mockReturnValue("wa_jwt=jwt-token; Path=/; HttpOnly");
  });

  it("retorna 400 quando JSON inválido", async () => {
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("retorna 400 quando body inválido (zod)", async () => {
    mockLogin.mockResolvedValue({ user: {} });
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "bad", password: "" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("retorna 401 e loga falha quando credenciais inválidas", async () => {
    mockLogin.mockResolvedValue({ error: "Credenciais inválidas" });
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "a@b.com", password: "x" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(mockLogAuth).toHaveBeenCalledWith(
      expect.objectContaining({ type: "login_failed" })
    );
  });

  it("retorna 200, cookie e loga sucesso", async () => {
    mockLogin.mockResolvedValue({
      user: {
        id: "u1",
        email: "a@b.com",
        name: "A",
        role: "manager",
        tenantId: "t1",
      },
    });
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "a@b.com", password: "secret123" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockCreateUserSession).toHaveBeenCalledWith("u1");
    expect(mockSignToken).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: "u1",
        jti: "sess-1",
        tenantId: "t1",
      })
    );
    expect(mockBuildSetCookieHeader).toHaveBeenCalledWith("jwt-token");
    expect(res.headers.get("Set-Cookie")).toBeTruthy();
    expect(mockLogAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "login_success",
        userId: "u1",
        tenantId: "t1",
        role: "manager",
      })
    );
  });
});
