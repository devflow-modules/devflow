import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createCheckoutSession,
  validateWebhook,
  parseWebhookEvent,
} from "../StripeAdapter";

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

describe("StripeAdapter", () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_xxx";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_xxx";
    process.env.STRIPE_PRICE_PRO = "price_pro_xxx";
    process.env.STRIPE_PRICE_TEAM = "price_team_xxx";
    mockSessionsCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/session/xxx",
      id: "cs_123",
    });
  });

  describe("parseWebhookEvent", () => {
    it("extrai userId, planId e stripeCustomerId de checkout.session.completed", () => {
      const event = {
        type: "checkout.session.completed",
        data: {
          object: {
            metadata: { userId: "user-1", planId: "PRO" },
            client_reference_id: "user-1",
            customer: "cus_123",
            subscription: "sub_456",
          },
        },
      } as Parameters<typeof parseWebhookEvent>[0];
      const parsed = parseWebhookEvent(event);
      expect(parsed).toEqual({
        type: "checkout.session.completed",
        userId: "user-1",
        planId: "PRO",
        stripeCustomerId: "cus_123",
        subscriptionId: "sub_456",
      });
    });

    it("retorna subscriptionId e stripeCustomerId em invoice.payment_succeeded", () => {
      const event = {
        type: "invoice.payment_succeeded",
        data: {
          object: {
            subscription: "sub_123",
            customer: "cus_abc",
          },
        },
      } as Parameters<typeof parseWebhookEvent>[0];
      const parsed = parseWebhookEvent(event);
      expect(parsed?.type).toBe("invoice.payment_succeeded");
      expect(parsed?.subscriptionId).toBe("sub_123");
      expect(parsed?.stripeCustomerId).toBe("cus_abc");
    });

    it("extrai userId, planId e stripeCustomerId de customer.subscription.updated", () => {
      const event = {
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_123",
            customer: "cus_123",
            metadata: { userId: "user-1", planId: "PRO" },
          },
        },
      } as Parameters<typeof parseWebhookEvent>[0];
      const parsed = parseWebhookEvent(event);
      expect(parsed).toEqual({
        type: "customer.subscription.updated",
        userId: "user-1",
        planId: "PRO",
        subscriptionId: "sub_123",
        stripeCustomerId: "cus_123",
      });
    });

    it("extrai userId e stripeCustomerId de customer.subscription.deleted (planId undefined)", () => {
      const event = {
        type: "customer.subscription.deleted",
        data: {
          object: {
            id: "sub_123",
            customer: "cus_123",
            metadata: { userId: "user-1", planId: "PRO" },
          },
        },
      } as Parameters<typeof parseWebhookEvent>[0];
      const parsed = parseWebhookEvent(event);
      expect(parsed?.type).toBe("customer.subscription.deleted");
      expect(parsed?.userId).toBe("user-1");
      expect(parsed?.planId).toBeUndefined();
      expect(parsed?.subscriptionId).toBe("sub_123");
      expect(parsed?.stripeCustomerId).toBe("cus_123");
    });

    it("retorna null para tipo de evento desconhecido", () => {
      const event = {
        type: "customer.created",
        data: { object: {} },
      } as Parameters<typeof parseWebhookEvent>[0];
      expect(parseWebhookEvent(event)).toBeNull();
    });
  });

  describe("createCheckoutSession", () => {
    it("cria sessão e retorna checkoutUrl", async () => {
      const result = await createCheckoutSession({
        userId: "user-1",
        email: "u@example.com",
        planId: "PRO",
        successUrl: "https://app.com/success",
        cancelUrl: "https://app.com/cancel",
      });
      expect(result.checkoutUrl).toBe("https://checkout.stripe.com/session/xxx");
      expect(result.sessionId).toBe("cs_123");
      expect(mockSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "subscription",
          client_reference_id: "user-1",
          customer_email: "u@example.com",
          metadata: { userId: "user-1", planId: "PRO" },
        })
      );
    });

    it("usa STRIPE_PRICE_TEAM para planId TEAM", async () => {
      await createCheckoutSession({
        userId: "user-1",
        email: "u@example.com",
        planId: "TEAM",
        successUrl: "/s",
        cancelUrl: "/c",
      });
      expect(mockSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [{ price: "price_team_xxx", quantity: 1 }],
        })
      );
    });
  });

  describe("validateWebhook", () => {
    it("retorna evento quando assinatura é válida", () => {
      const fakeEvent = {
        type: "checkout.session.completed",
        data: { object: { metadata: { userId: "u1", planId: "PRO" } } },
      };
      mockConstructEvent.mockReturnValue(fakeEvent);
      const event = validateWebhook("sig_xxx", "payload");
      expect(event).toEqual(fakeEvent);
      expect(mockConstructEvent).toHaveBeenCalledWith("payload", "sig_xxx", "whsec_xxx");
    });

    it("lança quando constructEvent lança", () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error("Invalid signature");
      });
      expect(() => validateWebhook("bad_sig", "payload")).toThrow("Invalid signature");
    });
  });
});
