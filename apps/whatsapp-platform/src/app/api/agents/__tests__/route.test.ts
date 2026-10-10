import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetAuthFromRequest = vi.fn();
const mockRequireRole = vi.fn();
const mockListOperationalAgents = vi.fn();
const mockProvisionTenantMember = vi.fn();

vi.mock("@/modules/auth", () => ({
  getAuthFromRequest: (...args: unknown[]) => mockGetAuthFromRequest(...args),
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
  ROLES_MANAGER_PLUS: ["manager", "platform_admin"],
}));

vi.mock("@/modules/inbox/operationsAgentsService", () => ({
  listOperationalAgents: (...args: unknown[]) => mockListOperationalAgents(...args),
}));

vi.mock("@/modules/inbox/teamProvisioningService", () => ({
  MANAGER_PROVISIONABLE_ROLES: ["operator", "manager"] as const,
  provisionTenantMember: (...args: unknown[]) => mockProvisionTenantMember(...args),
}));

describe("GET /api/agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t1", role: "manager", sub: "mgr-1" },
    });
    mockRequireRole.mockReturnValue(null);
    mockListOperationalAgents.mockResolvedValue([{ id: "u1", name: "Agente" }]);
  });

  it("retorna 403 para operator", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t1", role: "operator", sub: "op-1" },
    });
    mockRequireRole.mockReturnValue(new Response(null, { status: 403 }));

    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://x/api/agents"));
    expect(res.status).toBe(403);
    expect(mockListOperationalAgents).not.toHaveBeenCalled();
  });

  it("retorna lista para manager", async () => {
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://x/api/agents"));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(j.data.agents).toHaveLength(1);
  });
});

describe("POST /api/agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t1", role: "manager", sub: "mgr-1" },
    });
    mockRequireRole.mockReturnValue(null);
    mockProvisionTenantMember.mockResolvedValue({
      ok: true,
      user: {
        id: "u-op",
        name: "Bruno",
        email: "bruno@t.test",
        role: "operator",
        status: "pending",
      },
      activationUrl: "https://wa.example.com/activate?token=abc",
      emailSent: false,
    });
  });

  it("provisiona com tenant da sessão e ignora tenantId do body", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      new NextRequest("http://x/api/agents", {
        method: "POST",
        body: JSON.stringify({
          name: "Bruno",
          email: "bruno@t.test",
          role: "operator",
          tenantId: "foreign-tenant",
        }),
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(res.status).toBe(201);
    expect(mockProvisionTenantMember).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "t1",
        email: "bruno@t.test",
        role: "operator",
      })
    );
  });

  it("operator recebe 403", async () => {
    mockRequireRole.mockReturnValue(new Response(null, { status: 403 }));
    const { POST } = await import("../route");
    const res = await POST(
      new NextRequest("http://x/api/agents", {
        method: "POST",
        body: JSON.stringify({ name: "X", email: "x@t.test", role: "operator" }),
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(res.status).toBe(403);
    expect(mockProvisionTenantMember).not.toHaveBeenCalled();
  });
});
