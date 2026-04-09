import { describe, it, expect, vi, beforeEach } from "vitest";

const mockVerifyResult = vi.fn();
const mockUserSessionFindFirst = vi.fn();
const mockUserFindUnique = vi.fn();
const mockSessionUpdate = vi.fn();

vi.mock("../authService", () => ({
  verifyTokenResult: (...a: unknown[]) => mockVerifyResult(...a),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userSession: {
      findFirst: (...a: unknown[]) => mockUserSessionFindFirst(...a),
      update: (...a: unknown[]) => mockSessionUpdate(...a),
    },
    user: {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
    },
  },
}));

vi.mock("@/lib/auth-logger", () => ({
  logAuth: vi.fn(),
}));

describe("validateAuthToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionUpdate.mockResolvedValue({});
  });

  it("retorna null quando JWT inválido", async () => {
    mockVerifyResult.mockResolvedValue({ ok: false, reason: "invalid" });
    const { validateAuthToken } = await import("../verifyToken");
    expect(await validateAuthToken("bad")).toBeNull();
    expect(mockUserSessionFindFirst).not.toHaveBeenCalled();
  });

  it("retorna null quando falta jti", async () => {
    mockVerifyResult.mockResolvedValue({
      ok: true,
      payload: {
        sub: "u1",
        tenantId: "t1",
        email: "a@b.com",
        name: "A",
        role: "manager",
      },
    });
    const { validateAuthToken } = await import("../verifyToken");
    expect(await validateAuthToken("tok")).toBeNull();
  });

  it("retorna null quando sessão revogada ou inexistente", async () => {
    mockVerifyResult.mockResolvedValue({
      ok: true,
      payload: {
        sub: "u1",
        jti: "sid-1",
        tenantId: "t1",
        email: "a@b.com",
        name: "A",
        role: "manager",
      },
    });
    mockUserSessionFindFirst.mockResolvedValue(null);
    const { validateAuthToken } = await import("../verifyToken");
    expect(await validateAuthToken("tok")).toBeNull();
  });

  it("retorna null e revoga sessão quando tenant no token não coincide com DB", async () => {
    mockVerifyResult.mockResolvedValue({
      ok: true,
      payload: {
        sub: "u1",
        jti: "sid-1",
        tenantId: "t-old",
        email: "a@b.com",
        name: "A",
        role: "manager",
      },
    });
    mockUserSessionFindFirst.mockResolvedValue({
      id: "sid-1",
      userId: "u1",
      expiresAt: new Date(Date.now() + 3600_000),
      revokedAt: null,
    });
    mockUserFindUnique.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      name: "A",
      role: "manager",
      tenantId: "t-new",
    });
    const { validateAuthToken } = await import("../verifyToken");
    expect(await validateAuthToken("tok")).toBeNull();
    expect(mockSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sid-1" },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      })
    );
  });

  it("retorna AuthResult com claims normalizados da DB", async () => {
    mockVerifyResult.mockResolvedValue({
      ok: true,
      payload: {
        sub: "u1",
        jti: "sid-1",
        tenantId: "t1",
        email: "old@b.com",
        name: "Old",
        role: "operator",
      },
    });
    mockUserSessionFindFirst.mockResolvedValue({
      id: "sid-1",
      userId: "u1",
      expiresAt: new Date(Date.now() + 3600_000),
      revokedAt: null,
    });
    mockUserFindUnique.mockResolvedValue({
      id: "u1",
      email: "new@b.com",
      name: "New",
      role: "manager",
      tenantId: "t1",
    });
    const { validateAuthToken } = await import("../verifyToken");
    const auth = await validateAuthToken("tok");
    expect(auth).not.toBeNull();
    expect(auth!.sessionId).toBe("sid-1");
    expect(auth!.payload.email).toBe("new@b.com");
    expect(auth!.payload.name).toBe("New");
    expect(auth!.payload.role).toBe("manager");
    expect(auth!.payload.jti).toBe("sid-1");
  });
});
