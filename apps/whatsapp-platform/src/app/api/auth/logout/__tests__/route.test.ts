import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetAuthFromRequest = vi.fn();
const mockBuildClearCookieHeader = vi.fn();

const { mockRevokeUserSession } = vi.hoisted(() => ({
  mockRevokeUserSession: vi.fn(),
}));

vi.mock("@/modules/auth/sessionService", () => ({
  revokeUserSession: mockRevokeUserSession,
}));

vi.mock("@/modules/auth", () => ({
  getAuthFromRequest: (...a: unknown[]) => mockGetAuthFromRequest(...a),
  buildClearCookieHeader: () => mockBuildClearCookieHeader(),
}));

const mockLogAuth = vi.fn();
vi.mock("@/lib/auth-logger", () => ({
  logAuth: (...a: unknown[]) => mockLogAuth(...a),
}));

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRevokeUserSession.mockResolvedValue(undefined);
    mockBuildClearCookieHeader.mockReturnValue("wa_jwt=; Path=/; Max-Age=0");
  });

  it("limpa cookie mesmo sem sessão", async () => {
    mockGetAuthFromRequest.mockResolvedValue(null);
    const { POST } = await import("../route");
    const res = await POST(new NextRequest("http://localhost/api/auth/logout", { method: "POST" }));
    expect(res.status).toBe(200);
    expect(mockLogAuth).not.toHaveBeenCalled();
    expect(res.headers.get("Set-Cookie")).toBeTruthy();
  });

  it("regista logout quando há sessão", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: {
        sub: "u1",
        tenantId: "t1",
        email: "a@b.com",
        name: "U",
        role: "manager",
        jti: "sid-1",
      },
      token: "t",
      sessionId: "sid-1",
    });
    const { POST } = await import("../route");
    const res = await POST(new NextRequest("http://localhost/api/auth/logout", { method: "POST" }));
    expect(res.status).toBe(200);
    expect(mockRevokeUserSession).toHaveBeenCalledWith("sid-1");
    expect(mockLogAuth).toHaveBeenCalledWith({
      type: "logout",
      userId: "u1",
      tenantId: "t1",
      sessionId: "sid-1",
    });
  });
});
