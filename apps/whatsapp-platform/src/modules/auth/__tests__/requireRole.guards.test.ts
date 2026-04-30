import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { requireRole, ROLES_PLATFORM_ONLY, STAFF_ROLES, type AuthResult } from "../verifyToken";
import type { JwtPayload } from "../authService";

vi.mock("@/lib/auth-logger", () => ({ logAuth: vi.fn() }));

function auth(overrides: Partial<JwtPayload>): AuthResult {
  const payload: JwtPayload = {
    sub: "u1",
    tenantId: "t1",
    role: "manager",
    email: "a@b.c",
    name: "A",
    jti: "j1",
    iat: 1,
    exp: 9,
    ...overrides,
  };
  return { payload, token: "tok", sessionId: "j1" };
}

function reqCtx(path: string): Pick<NextRequest, "nextUrl" | "method"> {
  const r = new NextRequest(new URL(path, "http://localhost"));
  return { nextUrl: r.nextUrl, method: r.method };
}

describe("P0 — requireRole (guards rotas staff)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401 quando não há sessão", () => {
    const res = requireRole(null, STAFF_ROLES, reqCtx("/api/inbox/conversations"));
    expect(res).toBeInstanceOf(NextResponse);
    expect(res!.status).toBe(401);
  });

  it("403 quando role não está em STAFF_ROLES", () => {
    const res = requireRole(auth({ role: "viewer" as unknown as JwtPayload["role"] }), STAFF_ROLES, reqCtx("/api/inbox/conversations"));
    expect(res).toBeInstanceOf(NextResponse);
    expect(res!.status).toBe(403);
  });

  it("null quando manager (staff) acede a rota operacional", () => {
    const res = requireRole(auth({ role: "manager" }), STAFF_ROLES, reqCtx("/api/inbox/conversations"));
    expect(res).toBeNull();
  });

  it("null quando platform_admin acede", () => {
    const res = requireRole(auth({ role: "platform_admin" }), STAFF_ROLES, reqCtx("/api/inbox/conversations"));
    expect(res).toBeNull();
  });
});

describe("P0 — requireRole (rotas /api/admin/* — ROLES_PLATFORM_ONLY)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401 sem sessão", () => {
    const res = requireRole(null, ROLES_PLATFORM_ONLY, reqCtx("/api/admin/conversations"));
    expect(res).toBeInstanceOf(NextResponse);
    expect(res!.status).toBe(401);
  });

  it("403 manager", () => {
    const res = requireRole(auth({ role: "manager" }), ROLES_PLATFORM_ONLY, reqCtx("/api/admin/agent-status"));
    expect(res).toBeInstanceOf(NextResponse);
    expect(res!.status).toBe(403);
  });

  it("403 operator", () => {
    const res = requireRole(auth({ role: "operator" }), ROLES_PLATFORM_ONLY, reqCtx("/api/admin/conversations"));
    expect(res).toBeInstanceOf(NextResponse);
    expect(res!.status).toBe(403);
  });

  it("null para platform_admin", () => {
    const res = requireRole(auth({ role: "platform_admin" }), ROLES_PLATFORM_ONLY, reqCtx("/api/admin/queues"));
    expect(res).toBeNull();
  });
});
