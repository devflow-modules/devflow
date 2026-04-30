import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { AuthResult } from "@/modules/auth";

const mockProcessFollowUps = vi.fn();
const mockAuditOperationalAction = vi.fn();
const mockGate = vi.fn();

vi.mock("@/modules/commercial", () => ({
  processFollowUps: (...a: unknown[]) => mockProcessFollowUps(...a),
}));

vi.mock("@/modules/operations/recordOperationalAudit", () => ({
  auditOperationalAction: (...a: unknown[]) => mockAuditOperationalAction(...a),
}));

vi.mock("@/lib/adminApiAuth", () => ({
  gatePlatformAdminJwt: (...a: unknown[]) => mockGate(...a),
}));

const gateOk: AuthResult = {
  payload: {
    sub: "adm",
    tenantId: "t-run",
    role: "platform_admin",
    email: "a@b.c",
    name: "A",
    jti: "j1",
    iat: 1,
    exp: 9999999999,
  },
  token: "t",
  sessionId: "j1",
};

describe("POST /api/admin/run-worker", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockGate.mockResolvedValue({ ok: true, auth: gateOk });
    mockProcessFollowUps.mockResolvedValue({ processed: 1 });
  });

  it("regista auditOperationalAction antes do worker", async () => {
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/api/admin/run-worker", {
      method: "POST",
      body: JSON.stringify({ limit: 5 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockAuditOperationalAction).toHaveBeenCalledWith(
      "operational_worker_manual_run",
      "t-run",
      "adm",
      expect.objectContaining({ limit: 5 })
    );
    expect(mockProcessFollowUps).toHaveBeenCalledWith({ limit: 5, tenantId: "t-run" });
  });
});
