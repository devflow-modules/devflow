import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
const mockCreateCheckoutSession = vi.fn();
const mockIsStripeConfigured = vi.fn();
const mockUserFindFirst = vi.fn();
const mockTenantSubFindUnique = vi.fn();
const mockBillingSubFindUnique = vi.fn();
const mockTenantFindUnique = vi.fn();

vi.mock("@/modules/auth", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/modules/auth")>();
  return {
    ...mod,
    getAuthFromRequest: (...a: unknown[]) => mockAuth(...a),
  };
});
vi.mock("@/modules/stripe", () => ({
  createCheckoutSession: (...a: unknown[]) => mockCreateCheckoutSession(...a),
  isStripeConfigured: () => mockIsStripeConfigured(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: (...a: unknown[]) => mockUserFindFirst(...a) },
    tenantSubscription: { findUnique: (...a: unknown[]) => mockTenantSubFindUnique(...a) },
    billingSubscription: { findUnique: (...a: unknown[]) => mockBillingSubFindUnique(...a) },
    tenant: { findUnique: (...a: unknown[]) => mockTenantFindUnique(...a) },
  },
}));

describe("POST /api/stripe/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "SAAS");
    mockAuth.mockResolvedValue({ payload: { sub: "u1", tenantId: "t1", role: "manager" } });
    mockIsStripeConfigured.mockReturnValue(true);
    mockUserFindFirst.mockResolvedValue({ email: "user@test.com" });
    mockTenantSubFindUnique.mockResolvedValue(null);
    mockBillingSubFindUnique.mockResolvedValue(null);
    mockTenantFindUnique.mockResolvedValue(null);
    mockCreateCheckoutSession.mockResolvedValue({ checkoutUrl: "https://checkout.stripe.com/sess" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("401 sem auth", async () => {
    mockAuth.mockResolvedValue(null);
    const { POST } = await import("../route");
    const req = new NextRequest("http://x/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "PRO" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
  });

  it("403 para operador", async () => {
    mockAuth.mockResolvedValue({ payload: { sub: "u1", tenantId: "t1", role: "operator" } });
    const { POST } = await import("../route");
    const req = new NextRequest("http://x/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "PRO" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
  });

  it("503 se Stripe não configurado", async () => {
    mockIsStripeConfigured.mockReturnValue(false);
    const { POST } = await import("../route");
    const req = new NextRequest("http://x/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "PRO" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
  });

  it("400 para plan inválido", async () => {
    const { POST } = await import("../route");
    const req = new NextRequest("http://x/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "INVALID" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
  });

  it("cria checkout session e retorna url", async () => {
    const { POST } = await import("../route");
    const req = new NextRequest("http://x/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "PRO" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(j.data.url).toBe("https://checkout.stripe.com/sess");
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "t1",
        email: "user@test.com",
        plan: "PRO",
        stripeCustomerId: null,
      })
    );
  });
});
