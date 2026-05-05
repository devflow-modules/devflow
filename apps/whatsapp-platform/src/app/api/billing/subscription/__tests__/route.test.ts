import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
const mockGetSubscriptionView = vi.fn();

vi.mock("@/modules/auth", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/modules/auth")>();
  return {
    ...mod,
    getAuthFromRequest: (...a: unknown[]) => mockAuth(...a),
  };
});

vi.mock("@/modules/billing/billingService", () => ({
  getSubscriptionView: (...a: unknown[]) => mockGetSubscriptionView(...a),
}));

describe("GET /api/billing/subscription", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "SAAS");
    mockAuth.mockResolvedValue({
      payload: { sub: "u1", tenantId: "t-sub", role: "manager" },
    });
    mockGetSubscriptionView.mockResolvedValue({
      plan: "PRO",
      tenantCreatedAt: "2025-01-01T00:00:00.000Z",
      status: "active",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
      currentPeriodStart: "2025-03-01T00:00:00.000Z",
      currentPeriodEnd: "2025-04-01T00:00:00.000Z",
      cancelAtPeriodEnd: false,
      activeUntil: null,
      meteredBillingConfigured: true,
      lastInvoiceId: "in_1",
      lastInvoiceStatus: "paid",
      lastInvoiceAmountPaid: 1000,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("401 sem auth", async () => {
    mockAuth.mockResolvedValue(null);
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://x/api/billing/subscription"));
    expect(res.status).toBe(401);
    expect(mockGetSubscriptionView).not.toHaveBeenCalled();
  });

  it("403 para operador", async () => {
    mockAuth.mockResolvedValue({
      payload: { sub: "u1", tenantId: "t-sub", role: "operator" },
    });
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://x/api/billing/subscription"));
    expect(res.status).toBe(403);
    const j = await res.json();
    expect(j.error).toBe("Acesso negado");
    expect(mockGetSubscriptionView).not.toHaveBeenCalled();
  });

  it("200 para manager (dados do tenant)", async () => {
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://x/api/billing/subscription"));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(j.data.subscription.plan).toBe("PRO");
    expect(mockGetSubscriptionView).toHaveBeenCalledWith("t-sub");
  });

  it("200 para platform_admin", async () => {
    mockAuth.mockResolvedValue({
      payload: { sub: "u1", tenantId: "t-sub", role: "platform_admin" },
    });
    const { GET } = await import("../route");
    const res = await GET(new NextRequest("http://x/api/billing/subscription"));
    expect(res.status).toBe(200);
    expect(mockGetSubscriptionView).toHaveBeenCalledWith("t-sub");
  });
});
