import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getAuth: vi.fn(),
  requireRole: vi.fn(),
  list: vi.fn(),
  runJob: vi.fn(),
  ack: vi.fn(),
}));

vi.mock("@/modules/auth", () => ({
  getAuthFromRequest: (...a: unknown[]) => mocks.getAuth(...a),
  requireRole: (...a: unknown[]) => mocks.requireRole(...a),
  ROLES_MANAGER_PLUS: ["manager", "platform_admin"],
}));

vi.mock("@/modules/inbox/outboundSendReconcileService", () => ({
  listSendLedgerForAdmin: (...a: unknown[]) => mocks.list(...a),
  runOutboundSendReconcileJob: (...a: unknown[]) => mocks.runJob(...a),
  acknowledgeUnknownOutcome: (...a: unknown[]) => mocks.ack(...a),
}));

describe("admin inbox-send-requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuth.mockResolvedValue({
      payload: { tenantId: "t1", sub: "u1", role: "manager" },
    });
    mocks.requireRole.mockReturnValue(null);
    mocks.list.mockResolvedValue({ items: [], total: 0, skip: 0, take: 50 });
    mocks.runJob.mockResolvedValue({ markedUnknown: 0 });
    mocks.ack.mockResolvedValue({ ok: true });
  });

  it("GET 401/deny quando requireRole bloqueia", async () => {
    mocks.requireRole.mockReturnValue(
      new Response(JSON.stringify({ error: "forbidden" }), { status: 403 })
    );
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://localhost/api/admin/inbox-send-requests"));
    expect(res.status).toBe(403);
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it("GET lista scoped ao tenant", async () => {
    const { GET } = await import("../route");
    const res = await GET(
      new NextRequest("http://localhost/api/admin/inbox-send-requests?status=UNKNOWN_OUTCOME")
    );
    expect(res.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "t1", status: "UNKNOWN_OUTCOME" })
    );
  });

  it("POST reconcile tenant dry-run default", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      new NextRequest("http://localhost/api/admin/inbox-send-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(200);
    expect(mocks.runJob).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "t1", dryRun: true })
    );
  });

  it("acknowledge 409 se não UNKNOWN", async () => {
    mocks.ack.mockResolvedValue({ ok: false, code: "NOT_UNKNOWN" });
    const { POST } = await import("../[id]/acknowledge/route");
    const res = await POST(
      new NextRequest("http://localhost/api/admin/inbox-send-requests/x/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "ok" }),
      }),
      { params: Promise.resolve({ id: "x" }) }
    );
    expect(res.status).toBe(409);
  });

  it("acknowledge 200", async () => {
    const { POST } = await import("../[id]/acknowledge/route");
    const res = await POST(
      new NextRequest("http://localhost/api/admin/inbox-send-requests/x/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "ok" }),
      }),
      { params: Promise.resolve({ id: "x" }) }
    );
    expect(res.status).toBe(200);
    expect(mocks.ack).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "t1", id: "x", actorUserId: "u1" })
    );
  });
});
