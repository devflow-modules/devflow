import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockGetAuthFromRequest = vi.fn();
const mockRequireFeatureOr403 = vi.fn();
const mockTenantUpdate = vi.fn();

vi.mock("@/modules/auth", () => ({
  getAuthFromRequest: (...args: unknown[]) => mockGetAuthFromRequest(...args),
}));

vi.mock("@/modules/billing/featureGate", () => ({
  requireFeatureOr403: (...args: unknown[]) => mockRequireFeatureOr403(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: {
      update: (...args: unknown[]) => mockTenantUpdate(...args),
    },
  },
}));

describe("POST /api/tenants/me/api-key", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireFeatureOr403.mockResolvedValue(null);
    mockTenantUpdate.mockResolvedValue(undefined);
  });

  it("manager recebe 403", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t1", role: "manager" },
    });
    const { POST } = await import("../route");
    const res = await POST(new NextRequest("http://x/api/tenants/me/api-key", { method: "POST" }));
    expect(res.status).toBe(403);
    const j = await res.json();
    expect(j.code).toBe("FORBIDDEN");
    expect(mockTenantUpdate).not.toHaveBeenCalled();
  });

  it("platform_admin pode gerar chave", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t1", role: "platform_admin" },
    });
    const { POST } = await import("../route");
    const res = await POST(new NextRequest("http://x/api/tenants/me/api-key", { method: "POST" }));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(typeof j.apiKey).toBe("string");
    expect(j.apiKey.startsWith("wa_")).toBe(true);
    expect(mockTenantUpdate).toHaveBeenCalled();
  });
});
