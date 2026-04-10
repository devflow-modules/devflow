import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetAuthFromRequest = vi.fn();
const mockGetOrCreate = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());

vi.mock("@/modules/auth", async () => {
  const actual = await vi.importActual<typeof import("@/modules/auth")>("@/modules/auth");
  return {
    ...actual,
    getAuthFromRequest: (...a: unknown[]) => mockGetAuthFromRequest(...a),
  };
});

vi.mock("@/modules/operations/tenantOperationalConfigService", () => ({
  getOrCreateTenantOperationalConfig: (...a: unknown[]) => mockGetOrCreate(...a),
  updateTenantOperationalConfig: (...a: unknown[]) => mockUpdate(...a),
}));

vi.mock("@/modules/operations/recordOperationalAudit", () => ({
  auditOperationalAction: vi.fn(),
}));

describe("PATCH /api/admin/operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthFromRequest.mockResolvedValue({
      payload: {
        tenantId: "t1",
        sub: "u1",
        role: "manager",
      },
    });
    mockGetOrCreate.mockResolvedValue({
      id: "op",
      tenantId: "t1",
      aiEnabled: true,
      automationEnabled: true,
      updatedAt: new Date(),
      updatedByUserId: null,
    });
    mockUpdate.mockResolvedValue({
      id: "op",
      tenantId: "t1",
      aiEnabled: false,
      automationEnabled: true,
      updatedAt: new Date(),
      updatedByUserId: "u1",
    });
  });

  it("atualiza aiEnabled", async () => {
    const { PATCH } = await import("../route");
    const res = await PATCH(
      new NextRequest(new URL("http://localhost/api/admin/operations"), {
        method: "PATCH",
        body: JSON.stringify({ aiEnabled: false }),
      })
    );
    expect(res.status).toBe(200);
    const j = (await res.json()) as { success: boolean; data: { aiEnabled: boolean } };
    expect(j.success).toBe(true);
    expect(j.data.aiEnabled).toBe(false);
    expect(mockUpdate).toHaveBeenCalled();
  });
});
