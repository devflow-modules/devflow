import { describe, it, expect } from "vitest";

describe("stripeWebhook", () => {
  it("parseWebhookEvent extrai tenantId e plan de checkout.session.completed", async () => {
    const { parseWebhookEvent } = await import("../stripeWebhook");
    const event = {
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { tenantId: "t1", plan: "PRO" },
          customer: "cus_123",
          subscription: "sub_123",
        },
      },
    } as never;

    const parsed = parseWebhookEvent(event);
    expect(parsed).toEqual({
      type: "checkout.session.completed",
      tenantId: "t1",
      plan: "PRO",
      stripeCustomerId: "cus_123",
      subscriptionId: "sub_123",
    });
  });

  it("parseWebhookEvent usa userId como fallback de tenantId", async () => {
    const { parseWebhookEvent } = await import("../stripeWebhook");
    const event = {
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { userId: "t1", planId: "PRO" },
          customer: "cus_123",
          subscription: "sub_123",
        },
      },
    } as never;

    const parsed = parseWebhookEvent(event);
    expect(parsed?.tenantId).toBe("t1");
    expect(parsed?.plan).toBe("PRO");
  });

  it("parseWebhookEvent customer.subscription.deleted", async () => {
    const { parseWebhookEvent } = await import("../stripeWebhook");
    const event = {
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_123",
          metadata: { tenantId: "t1" },
          customer: "cus_123",
          cancel_at_period_end: false,
        },
      },
    } as never;

    const parsed = parseWebhookEvent(event);
    expect(parsed?.type).toBe("customer.subscription.deleted");
    expect(parsed?.subscriptionId).toBe("sub_123");
    expect(parsed?.tenantId).toBe("t1");
    expect(parsed?.plan).toBeUndefined();
  });

  it("parseWebhookEvent invoice.payment_failed retorna stripeCustomerId e subscriptionId", async () => {
    const { parseWebhookEvent } = await import("../stripeWebhook");
    const event = {
      type: "invoice.payment_failed",
      data: {
        object: {
          customer: "cus_456",
          subscription: "sub_789",
        },
      },
    } as never;

    const parsed = parseWebhookEvent(event);
    expect(parsed?.type).toBe("invoice.payment_failed");
    expect(parsed?.stripeCustomerId).toBe("cus_456");
    expect(parsed?.subscriptionId).toBe("sub_789");
  });
});
