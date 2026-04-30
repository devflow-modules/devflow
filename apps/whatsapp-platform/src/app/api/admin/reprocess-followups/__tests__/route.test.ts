import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { AuthResult } from "@/modules/auth";

const mockRequeue = vi.fn();
const mockAuditOperationalAction = vi.fn();
const mockGate = vi.fn();

vi.mock("@/modules/operations/reprocessFollowUpTasks", () => ({
  requeuePendingFollowUpTasksForTenant: (...a: unknown[]) => mockRequeue(...a),
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
    tenantId: "t-req",
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

describe("POST /api/admin/reprocess-followups", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockGate.mockResolvedValue({ ok: true, auth: gateOk });
    mockRequeue.mockResolvedValue({ updated: 3 });
  });

  it("regista auditOperationalAction antes de reencaminhar tarefas", async () => {
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/api/admin/reprocess-followups", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockAuditOperationalAction).toHaveBeenCalledWith(
      "operational_reprocess_followups",
      "t-req",
      "adm",
      {}
    );
    expect(mockRequeue).toHaveBeenCalledWith("t-req");
  });
});
