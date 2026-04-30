import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { AuthResult } from "@/modules/auth";

const mockGetAuth = vi.fn();
const mockAuthorizeProvisionBearer = vi.fn();

vi.mock("@/modules/auth", async () => {
  const actual = await vi.importActual<typeof import("@/modules/auth")>("@/modules/auth");
  return {
    ...actual,
    getAuthFromRequest: (...a: unknown[]) => mockGetAuth(...a),
  };
});

vi.mock("@/lib/adminProvisionBearer", () => ({
  authorizeProvisionBearer: (...a: unknown[]) => mockAuthorizeProvisionBearer(...a),
}));

describe("adminApiAuth — gatePlatformAdminJwt / gatePlatformAdminOrProvisionSecret", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  const platformAuth: AuthResult = {
    payload: {
      sub: "admin-1",
      tenantId: "t1",
      role: "platform_admin",
      email: "ops@example.com",
      name: "Ops",
      jti: "jid",
      iat: 1,
      exp: 9999999999,
    },
    token: "tok",
    sessionId: "jid",
  };

  const managerAuth: AuthResult = {
    ...platformAuth,
    payload: {
      ...platformAuth.payload,
      sub: "m1",
      role: "manager",
      email: "m@tenant.com",
    },
  };

  it("JWT: 401 sem auth", async () => {
    mockGetAuth.mockResolvedValue(null);
    const { gatePlatformAdminJwt } = await import("../adminApiAuth");
    const res = await gatePlatformAdminJwt(new NextRequest("http://x/api/admin/metrics"));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.response.status).toBe(401);
  });

  it("JWT: 403 manager", async () => {
    mockGetAuth.mockResolvedValue(managerAuth);
    const { gatePlatformAdminJwt } = await import("../adminApiAuth");
    const res = await gatePlatformAdminJwt(new NextRequest("http://x/api/admin/metrics"));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.response.status).toBe(403);
  });

  it("JWT: permite platform_admin", async () => {
    mockGetAuth.mockResolvedValue(platformAuth);
    const { gatePlatformAdminJwt } = await import("../adminApiAuth");
    const res = await gatePlatformAdminJwt(new NextRequest("http://x/api/admin/metrics"));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.auth.payload.role).toBe("platform_admin");
  });

  it("provision: Bearer sem JWT aceita automation", async () => {
    mockAuthorizeProvisionBearer.mockReturnValue(true);
    mockGetAuth.mockResolvedValue(null);
    const { gatePlatformAdminOrProvisionSecret } = await import("../adminApiAuth");
    const res = await gatePlatformAdminOrProvisionSecret(new NextRequest("http://x/a"));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.viaProvisionSecret).toBe(true);
  });

  it("provision: sem Bearer exige platform_admin na sessão", async () => {
    mockAuthorizeProvisionBearer.mockReturnValue(false);
    mockGetAuth.mockResolvedValue(managerAuth);
    const { gatePlatformAdminOrProvisionSecret } = await import("../adminApiAuth");
    const res = await gatePlatformAdminOrProvisionSecret(new NextRequest("http://x/a"));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.response.status).toBe(403);
  });

  it("provision: sem Bearer e sem JWT devolve 401", async () => {
    mockAuthorizeProvisionBearer.mockReturnValue(false);
    mockGetAuth.mockResolvedValue(null);
    const { gatePlatformAdminOrProvisionSecret } = await import("../adminApiAuth");
    const res = await gatePlatformAdminOrProvisionSecret(new NextRequest("http://x/a"));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.response.status).toBe(401);
  });

  it("JWT operator devolve 403", async () => {
    mockGetAuth.mockResolvedValue({
      ...platformAuth,
      payload: { ...platformAuth.payload, role: "operator", sub: "op1", email: "o@x.c" },
    });
    const { gatePlatformAdminJwt } = await import("../adminApiAuth");
    const res = await gatePlatformAdminJwt(new NextRequest("http://x/api/admin/run-worker"));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.response.status).toBe(403);
  });
});
