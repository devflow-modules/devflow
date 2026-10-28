import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const mockPortalCreate = vi.fn();

vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(function (this: unknown) {
    return {
      billingPortal: {
        sessions: {
          create: (...args: unknown[]) => mockPortalCreate(...args),
        },
      },
    };
  }),
}));

describe("StripeCustomerPortalAdapter preview guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
    process.env.STRIPE_SECRET_KEY = "sk_live_synthetic_not_real";
    delete process.env.STRIPE_TEST_SECRET_KEY;
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    mockPortalCreate.mockResolvedValue({ url: "https://billing.stripe.com/session/xxx" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("T02 Preview blocks billingPortal.sessions.create", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NODE_ENV", "production");
    const { createCustomerPortalSession } = await import(
      "../adapters/StripeCustomerPortalAdapter"
    );
    await expect(
      createCustomerPortalSession({
        stripeCustomerId: "cus_synthetic",
        returnUrl: "https://app.example/billing",
      })
    ).rejects.toMatchObject({ code: "stripe_unavailable_in_environment" });
    expect(mockPortalCreate).not.toHaveBeenCalled();
  });

  it("T07 Production mocked portal still works", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NODE_ENV", "production");
    const { createCustomerPortalSession } = await import(
      "../adapters/StripeCustomerPortalAdapter"
    );
    const result = await createCustomerPortalSession({
      stripeCustomerId: "cus_synthetic",
      returnUrl: "https://app.example/billing",
    });
    expect(result.portalUrl).toContain("billing.stripe.com");
    expect(mockPortalCreate).toHaveBeenCalledOnce();
  });
});
