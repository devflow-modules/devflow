import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockGetAuthFromRequest = vi.fn();
const mockRequireRole = vi.fn();
const mockRequireFeatureOr403 = vi.fn();
const mockFindMany = vi.fn();
const mockCreate = vi.fn();

vi.mock("@/modules/auth", () => ({
  getAuthFromRequest: (...args: unknown[]) => mockGetAuthFromRequest(...args),
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
  ROLES_OPERATIONAL: ["operator", "manager", "platform_admin"],
  ROLES_MANAGER_PLUS: ["manager", "platform_admin"],
}));

vi.mock("@/modules/billing/featureGate", () => ({
  requireFeatureOr403: (...args: unknown[]) => mockRequireFeatureOr403(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    waAutomationRule: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

vi.mock("@/lib/platformAuditLog", () => ({
  recordPlatformAudit: vi.fn(),
}));

describe("POST /api/automation/rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t1", sub: "u1", role: "manager" },
    });
    mockRequireRole.mockReturnValue(null);
    mockRequireFeatureOr403.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "r1",
      name: "Regra",
      isActive: true,
      triggerType: "MESSAGE_INBOUND",
      conditions: [],
      actions: [{ type: "logAction", params: { message: "ok" } }],
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
  });

  it("operator recebe 403 para criar regra", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t1", sub: "u1", role: "operator" },
    });
    mockRequireRole.mockReturnValue(new Response(null, { status: 403 }));

    const { POST } = await import("../route");
    const req = new NextRequest("http://x/api/automation/rules", {
      method: "POST",
      body: JSON.stringify({
        name: "R1",
        triggerType: "MESSAGE_INBOUND",
        actions: [{ type: "logAction", params: { message: "x" } }],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("manager pode criar regra", async () => {
    const { POST } = await import("../route");
    const req = new NextRequest("http://x/api/automation/rules", {
      method: "POST",
      body: JSON.stringify({
        name: "R1",
        triggerType: "MESSAGE_INBOUND",
        conditions: [],
        actions: [{ type: "logAction", params: { message: "x" } }],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(j.data.rule.id).toBe("r1");
  });
});
