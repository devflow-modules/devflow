import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetAuthFromRequest = vi.fn();

vi.mock("@/modules/auth", () => ({
  getAuthFromRequest: (...a: unknown[]) => mockGetAuthFromRequest(...a),
}));

describe("GET /api/auth/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 401 quando sem sessão", async () => {
    mockGetAuthFromRequest.mockResolvedValue(null);
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://localhost/api/auth/verify"));
    expect(res.status).toBe(401);
    const data = (await res.json()) as {
      success: boolean;
      error?: { code: string; message: string };
    };
    expect(data.success).toBe(false);
    expect(data.error?.code).toBe("UNAUTHORIZED");
  });

  it("retorna 200 e user quando autenticado", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: {
        sub: "u1",
        email: "a@b.com",
        name: "User",
        role: "manager",
        tenantId: "t1",
        jti: "sid-1",
      },
      token: "jwt",
      sessionId: "sid-1",
    });
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://localhost/api/auth/verify"));
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      success: boolean;
      data: {
        valid: boolean;
        user: { id: string; email: string; name: string; role: string; tenantId: string };
      };
    };
    expect(data.success).toBe(true);
    expect(data.data.valid).toBe(true);
    expect(data.data.user).toEqual({
      id: "u1",
      email: "a@b.com",
      name: "User",
      role: "manager",
      tenantId: "t1",
    });
  });
});
