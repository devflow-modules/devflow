import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const mockMeterCreate = vi.fn();

vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(function (this: unknown) {
    return {
      billing: {
        meterEvents: {
          create: (...args: unknown[]) => mockMeterCreate(...args),
        },
      },
      billingPortal: {
        sessions: {
          create: vi.fn(),
        },
      },
      checkout: {
        sessions: {
          create: vi.fn(),
        },
      },
      webhooks: {
        constructEvent: vi.fn(),
      },
    };
  }),
}));

describe("whatsapp stripeClient runtime policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    delete process.env.WHATSAPP_STRIPE_SECRET_KEY;
    delete process.env.WHATSAPP_STRIPE_TEST_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_TEST_SECRET_KEY;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("Preview + synthetic live key: getStripe throws before SDK use", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WHATSAPP_STRIPE_SECRET_KEY", "sk_live_synthetic_not_real");
    const { getStripe, isStripeConfigured } = await import("../stripeClient");
    expect(isStripeConfigured()).toBe(false);
    expect(() => getStripe()).toThrow(
      expect.objectContaining({ code: "stripe_unavailable_in_environment" })
    );
  });

  it("T03 Preview blocks meterEvents via getStripe", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WHATSAPP_STRIPE_SECRET_KEY", "sk_live_synthetic_not_real");
    vi.stubEnv("WHATSAPP_STRIPE_METERED_PRICE_MESSAGES", "price_msg_synthetic");
    const { createMeterEvent } = await import(
      "@/modules/billing/infrastructure/stripeMeterClient"
    );
    const result = await createMeterEvent({
      eventName: "whatsapp_messages",
      stripeCustomerId: "cus_synthetic",
      value: 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).not.toContain("sk_live_");
    }
    expect(mockMeterCreate).not.toHaveBeenCalled();
  });

  it("local test key remains usable", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("WHATSAPP_STRIPE_TEST_SECRET_KEY", "sk_test_synthetic_not_real");
    const { getStripe, isStripeConfigured } = await import("../stripeClient");
    expect(isStripeConfigured()).toBe(true);
    expect(() => getStripe()).not.toThrow();
  });

  it("verified Production allows live key", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WHATSAPP_STRIPE_SECRET_KEY", "sk_live_synthetic_not_real");
    const { getStripe, isStripeConfigured } = await import("../stripeClient");
    expect(isStripeConfigured()).toBe(true);
    expect(() => getStripe()).not.toThrow();
  });

  it("getWebhookSecret denied on Preview before reading secret use", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WHATSAPP_STRIPE_WEBHOOK_SECRET", "whsec_synthetic_should_not_leak");
    const { getWebhookSecret } = await import("../stripeClient");
    expect(() => getWebhookSecret()).toThrow(
      expect.objectContaining({ code: "stripe_unavailable_in_environment" })
    );
  });
});
