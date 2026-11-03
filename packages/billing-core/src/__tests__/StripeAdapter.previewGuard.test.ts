import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const mockSessionsCreate = vi.fn();
const mockConstructEvent = vi.fn();

vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(function (this: unknown) {
    return {
      checkout: {
        sessions: {
          create: mockSessionsCreate,
        },
      },
      webhooks: {
        constructEvent: mockConstructEvent,
      },
    };
  }),
}));

describe("StripeAdapter preview / live fail-closed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
    process.env.STRIPE_SECRET_KEY = "sk_live_synthetic_not_real";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_synthetic";
    process.env.STRIPE_PRICE_PRO = "price_live_synthetic";
    process.env.STRIPE_PRICE_TEAM = "price_team_synthetic";
    delete process.env.STRIPE_TEST_SECRET_KEY;
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    mockSessionsCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/session/xxx",
      id: "cs_123",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("T01 Preview + live key: no checkout network call", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NODE_ENV", "production");
    const { createCheckoutSession } = await import("../adapters/StripeAdapter");
    await expect(
      createCheckoutSession({
        userId: "user-1",
        email: "u@example.com",
        planId: "PRO",
        successUrl: "https://app.com/success",
        cancelUrl: "https://app.com/cancel",
      })
    ).rejects.toMatchObject({ code: "stripe_unavailable_in_environment" });
    expect(mockSessionsCreate).not.toHaveBeenCalled();
  });

  it("T05 legacy billing-core live key blocked on Preview", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NODE_ENV", "production");
    const { createCheckoutSession } = await import("../adapters/StripeAdapter");
    await expect(
      createCheckoutSession({
        userId: "user-1",
        email: "u@example.com",
        planId: "PRO",
        successUrl: "/s",
        cancelUrl: "/c",
      })
    ).rejects.toMatchObject({ code: "stripe_unavailable_in_environment" });
    expect(mockSessionsCreate).not.toHaveBeenCalled();
  });

  it("T06 unknown environment blocks live writes", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "Production");
    vi.stubEnv("NODE_ENV", "production");
    const { createCheckoutSession } = await import("../adapters/StripeAdapter");
    await expect(
      createCheckoutSession({
        userId: "user-1",
        email: "u@example.com",
        planId: "PRO",
        successUrl: "/s",
        cancelUrl: "/c",
      })
    ).rejects.toMatchObject({ code: "stripe_unavailable_in_environment" });
    expect(mockSessionsCreate).not.toHaveBeenCalled();
  });

  it("T07 Production mocked: checkout still reachable", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NODE_ENV", "production");
    const { createCheckoutSession } = await import("../adapters/StripeAdapter");
    const result = await createCheckoutSession({
      userId: "user-1",
      email: "u@example.com",
      planId: "PRO",
      successUrl: "/s",
      cancelUrl: "/c",
    });
    expect(result.checkoutUrl).toContain("checkout.stripe.com");
    expect(mockSessionsCreate).toHaveBeenCalledOnce();
  });

  it("T04 Preview blocks webhook validation before constructEvent", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NODE_ENV", "production");
    const { validateWebhook } = await import("../adapters/StripeAdapter");
    expect(() => validateWebhook("sig", "payload")).toThrow(
      expect.objectContaining({ code: "stripe_unavailable_in_environment" })
    );
    expect(mockConstructEvent).not.toHaveBeenCalled();
  });
});
