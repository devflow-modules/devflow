import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAssign = vi.fn();
const mockRecordAudit = vi.fn();
const mockFindFirst = vi.fn();
const mockAuth = vi.fn();
const mockRequireRole = vi.fn();

vi.mock("@/modules/inbox/threadAssignmentService", () => ({
  assignThread: (...args: unknown[]) => mockAssign(...args),
}));
vi.mock("@/lib/platformAuditLog", () => ({
  recordPlatformAudit: (...args: unknown[]) => mockRecordAudit(...args),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    waInboxThread: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));
vi.mock("@/modules/auth", () => ({
  getAuthFromRequest: (...args: unknown[]) => mockAuth(...args),
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
  ROLES_PLATFORM_ONLY: ["platform_admin"],
}));
vi.mock("@/lib/rate-limit", () => ({
  getClientIp: () => "127.0.0.1",
}));

describe("POST /api/admin/conversations/[id]/assign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockReturnValue(null);
    mockAuth.mockResolvedValue({
      payload: { tenantId: "t1", sub: "admin1", role: "platform_admin" },
    });
    mockFindFirst.mockResolvedValue({ id: "thread1", tenantId: "t1" });
    mockAssign.mockResolvedValue({ ok: true, changed: true });
  });

  it("audita só quando changed=true", async () => {
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "thread1" }) });
    expect(res.status).toBe(200);
    expect(mockRecordAudit).toHaveBeenCalledTimes(1);
  });

  it("no-op changed=false não chama recordPlatformAudit", async () => {
    mockAssign.mockResolvedValue({ ok: true, changed: false });
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "thread1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.changed).toBe(false);
    expect(mockRecordAudit).not.toHaveBeenCalled();
  });
});
