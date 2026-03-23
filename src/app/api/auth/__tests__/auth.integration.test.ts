import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLogin = vi.fn();
const mockSignToken = vi.fn();
const mockBuildSetCookieHeader = vi.fn();
const mockBuildClearCookieHeader = vi.fn();
const mockGetAuthFromRequest = vi.fn();
const mockLogAuth = vi.fn();

vi.mock("@wa/modules/auth", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@wa/modules/auth")>();
  return {
    ...mod,
    login: (...args: unknown[]) => mockLogin(...args),
    signToken: (...args: unknown[]) => mockSignToken(...args),
    buildSetCookieHeader: (t: string) => mockBuildSetCookieHeader(t),
    buildClearCookieHeader: () => mockBuildClearCookieHeader(),
    getAuthFromRequest: (...args: unknown[]) => mockGetAuthFromRequest(...args),
  };
});

vi.mock("@/lib/auth-logger", () => ({ logAuth: (e: unknown) => mockLogAuth(e) }));
vi.mock("@wa/lib/auth-logger", () => ({ logAuth: (e: unknown) => mockLogAuth(e) }));

const mockCheckRateLimit = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: () => "127.0.0.1",
}));

describe("Auth API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue({ ok: true });
    mockBuildSetCookieHeader.mockReturnValue("cookie=value");
    mockBuildClearCookieHeader.mockReturnValue("cookie=; Max-Age=0");
  });

  describe("POST /api/auth/login", () => {
    it("login válido retorna 200 e Set-Cookie", async () => {
      const user = { id: "u1", email: "a@b.com", name: "User", role: "admin" as const, tenantId: "t1" };
      mockLogin.mockResolvedValue({ user });
      mockSignToken.mockResolvedValue("jwt-token");

      const { POST } = await import("../login/route");
      const req = new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "a@b.com", password: "secret" }),
      });
      const res = await POST(req as never);

      expect(res.status).toBe(200);
      expect(res.headers.get("Set-Cookie")).toBeTruthy();
      const data = await res.json();
      expect(data.user).toEqual(user);
      expect(mockSignToken).toHaveBeenCalledWith(
        expect.objectContaining({ sub: "u1", email: "a@b.com", tenantId: "t1" })
      );
    });

    it("login inválido retorna 401", async () => {
      mockLogin.mockResolvedValue({ error: "Credenciais inválidas" });

      const { POST } = await import("../login/route");
      const req = new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "a@b.com", password: "wrong" }),
      });
      const res = await POST(req as never);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("Credenciais inválidas");
      expect(mockLogAuth).toHaveBeenCalledWith(expect.objectContaining({ type: "login_failed" }));
    });

    it("rate limit excedido retorna 429", async () => {
      mockCheckRateLimit.mockReturnValue({ ok: false, retryAfter: 60 });

      const { POST } = await import("../login/route");
      const req = new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "a@b.com", password: "secret" }),
      });
      const res = await POST(req as never);

      expect(res.status).toBe(429);
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it("body inválido retorna 400", async () => {
      const { POST } = await import("../login/route");
      const req = new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const res = await POST(req as never);

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("logout retorna 200 e limpa cookie", async () => {
      mockGetAuthFromRequest.mockResolvedValue({
        payload: { sub: "u1", tenantId: "t1", email: "", name: "", role: "admin" },
      });

      const { POST } = await import("../logout/route");
      const req = new Request("http://localhost/api/auth/logout", { method: "POST" });
      const res = await POST(req as never);

      expect(res.status).toBe(200);
      expect(res.headers.get("Set-Cookie")).toBeTruthy();
      expect(mockLogAuth).toHaveBeenCalledWith(
        expect.objectContaining({ type: "logout", userId: "u1", tenantId: "t1" })
      );
    });
  });

  describe("GET /api/auth/verify", () => {
    it("sem token retorna 401", async () => {
      mockGetAuthFromRequest.mockResolvedValue(null);

      const { GET } = await import("../verify/route");
      const req = new Request("http://localhost/api/auth/verify");
      const res = await GET(req as never);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.valid).toBe(false);
    });

    it("com token válido retorna 200 e user", async () => {
      mockGetAuthFromRequest.mockResolvedValue({
        payload: {
          sub: "u1",
          email: "a@b.com",
          name: "User",
          role: "admin",
          tenantId: "t1",
        },
      });

      const { GET } = await import("../verify/route");
      const req = new Request("http://localhost/api/auth/verify");
      const res = await GET(req as never);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.valid).toBe(true);
      expect(data.user).toEqual({
        id: "u1",
        email: "a@b.com",
        name: "User",
        role: "admin",
        tenantId: "t1",
      });
    });
  });

  describe("requireRole", () => {
    it("role errada retorna 403", async () => {
      const { requireRole } = await import("@wa/modules/auth");
      const auth = {
        payload: { sub: "u1", tenantId: "t1", email: "", name: "", role: "agent" as const },
        token: "x",
      };
      const res = requireRole(auth, ["admin"]);
      expect(res).not.toBeNull();
      expect(res!.status).toBe(403);
      expect(mockLogAuth).toHaveBeenCalledWith(
        expect.objectContaining({ type: "forbidden", userId: "u1", tenantId: "t1" })
      );
    });

    it("role correta retorna null (autorizado)", async () => {
      const { requireRole } = await import("@wa/modules/auth");
      const auth = {
        payload: { sub: "u1", tenantId: "t1", email: "", name: "", role: "admin" as const },
        token: "x",
      };
      const res = requireRole(auth, ["admin"]);
      expect(res).toBeNull();
    });

    it("auth null retorna 401", async () => {
      const { requireRole } = await import("@wa/modules/auth");
      const res = requireRole(null, ["admin"]);
      expect(res).not.toBeNull();
      expect(res!.status).toBe(401);
      expect(mockLogAuth).toHaveBeenCalledWith(expect.objectContaining({ type: "unauthorized" }));
    });
  });
});
