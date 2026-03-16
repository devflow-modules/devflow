import { describe, it, expect, beforeEach, vi } from "vitest";
import { createCustomerPortalSession } from "../adapters/StripeCustomerPortalAdapter";

const mockBillingPortalSessionsCreate = vi.fn();

vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(function (this: unknown) {
    return {
      billingPortal: {
        sessions: {
          create: mockBillingPortalSessionsCreate,
        },
      },
    };
  }),
}));

describe("StripeCustomerPortalAdapter", () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_xxx";
    vi.clearAllMocks();
  });

  it("cria sessão do portal e retorna portalUrl", async () => {
    mockBillingPortalSessionsCreate.mockResolvedValue({
      url: "https://billing.stripe.com/session/portal_xxx",
    });

    const result = await createCustomerPortalSession({
      stripeCustomerId: "cus_123",
      returnUrl: "https://app.com/billing",
    });

    expect(result.portalUrl).toBe("https://billing.stripe.com/session/portal_xxx");
    expect(mockBillingPortalSessionsCreate).toHaveBeenCalledWith({
      customer: "cus_123",
      return_url: "https://app.com/billing",
    });
  });

  it("propaga erro quando Stripe falha", async () => {
    mockBillingPortalSessionsCreate.mockRejectedValue(new Error("Stripe error"));
    await expect(
      createCustomerPortalSession({ stripeCustomerId: "cus_123", returnUrl: "https://app.com" })
    ).rejects.toThrow("Stripe error");
  });
});
