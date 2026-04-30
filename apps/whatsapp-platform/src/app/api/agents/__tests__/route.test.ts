import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetAuthFromRequest = vi.fn();
const mockRequireRole = vi.fn();
const mockListOperationalAgents = vi.fn();

vi.mock("@/modules/auth", () => ({
  getAuthFromRequest: (...args: unknown[]) => mockGetAuthFromRequest(...args),
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
  ROLES_MANAGER_PLUS: ["manager", "platform_admin"],
}));

vi.mock("@/modules/inbox/operationsAgentsService", () => ({
  listOperationalAgents: (...args: unknown[]) => mockListOperationalAgents(...args),
}));

describe("GET /api/agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t1", role: "manager" },
    });
    mockRequireRole.mockReturnValue(null);
    mockListOperationalAgents.mockResolvedValue([{ id: "u1", name: "Agente" }]);
  });

  it("retorna 403 para operator", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t1", role: "operator" },
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
