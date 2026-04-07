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
    const data = await res.json();
    expect(data.valid).toBe(false);
  });

  it("retorna 200 e user quando autenticado", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: {
        sub: "u1",
        email: "a@b.com",
        name: "User",
        role: "admin",
        tenantId: "t1",
      },
    });
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://localhost/api/auth/verify"));
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
