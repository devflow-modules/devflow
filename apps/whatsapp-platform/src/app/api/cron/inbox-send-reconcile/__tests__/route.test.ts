import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  runJob: vi.fn(),
  getAuth: vi.fn(),
  requireRole: vi.fn(),
  list: vi.fn(),
  ack: vi.fn(),
}));

vi.mock("@/modules/inbox/outboundSendReconcileService", () => ({
  runOutboundSendReconcileJob: (...a: unknown[]) => mocks.runJob(...a),
  listSendLedgerForAdmin: (...a: unknown[]) => mocks.list(...a),
  acknowledgeUnknownOutcome: (...a: unknown[]) => mocks.ack(...a),
}));

vi.mock("@/modules/auth", () => ({
  getAuthFromRequest: (...a: unknown[]) => mocks.getAuth(...a),
  requireRole: (...a: unknown[]) => mocks.requireRole(...a),
  ROLES_MANAGER_PLUS: ["manager", "platform_admin"],
}));

describe("POST /api/cron/inbox-send-reconcile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CRON_SECRET;
    delete process.env.BILLING_CRON_SECRET;
    mocks.runJob.mockResolvedValue({ markedUnknown: 1 });
  });

  it("503 sem CRON_SECRET", async () => {
    const { POST } = await import("../route");
    const res = await POST(new NextRequest("http://localhost/api/cron/inbox-send-reconcile", { method: "POST" }));
    expect(res.status).toBe(503);
    expect(mocks.runJob).not.toHaveBeenCalled();
  });

  it("401 com Bearer inválido", async () => {
    process.env.CRON_SECRET = "secret";
    const { POST } = await import("../route");
    const res = await POST(
      new NextRequest("http://localhost/api/cron/inbox-send-reconcile", {
        method: "POST",
        headers: { authorization: "Bearer wrong" },
      })
    );
    expect(res.status).toBe(401);
  });

  it("200 dry-run com segredo", async () => {
    process.env.CRON_SECRET = "secret";
    const { POST } = await import("../route");
    const res = await POST(
      new NextRequest("http://localhost/api/cron/inbox-send-reconcile?dryRun=1&limit=10", {
        method: "POST",
        headers: { authorization: "Bearer secret" },
      })
    );
    expect(res.status).toBe(200);
    expect(mocks.runJob).toHaveBeenCalledWith(
      expect.objectContaining({ dryRun: true, limit: 10 })
    );
  });
});
