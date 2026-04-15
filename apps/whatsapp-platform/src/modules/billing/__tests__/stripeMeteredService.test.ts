import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const createMeterEvent = vi.fn().mockResolvedValue({});

vi.mock("@/modules/stripe/stripeClient", () => ({
  getStripe: () => ({
    billing: {
      meterEvents: {
        create: (...args: unknown[]) => createMeterEvent(...args),
      },
    },
  }),
}));

const mockBillingSubscription = {
  findUnique: vi.fn(),
  updateMany: vi.fn(),
};

const mockTransaction = vi.fn((fn: (tx: unknown) => Promise<unknown>) =>
  fn({ billingSubscription: { updateMany: mockBillingSubscription.updateMany } })
);

vi.mock("@/lib/prisma", () => ({
  prisma: {
    billingSubscription: mockBillingSubscription,
    $transaction: mockTransaction,
  },
}));

describe("stripeMeteredService (meter events)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("WHATSAPP_STRIPE_METERED_PRICE_MESSAGES", "price_msg");
    vi.stubEnv("WHATSAPP_STRIPE_METERED_PRICE_AI", "price_ai");
    vi.stubEnv("WHATSAPP_STRIPE_TEST_SECRET_KEY", "sk_test_x");
    mockBillingSubscription.findUnique.mockResolvedValue({
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_1",
      status: "active",
      plan: "PRO",
      messagesIncludedUsed: 19998,
      aiIncludedUsed: 0,
      messagesOverageSent: 0,
      aiOverageSent: 0,
    });
    mockBillingSubscription.updateMany.mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reportMessageUsage envia overage ao Stripe via meter event", async () => {
    const { reportMessageUsage } = await import("../application/reportMessageUsage");
    const r = await reportMessageUsage({
      tenantId: "t1",
      quantity: 5,
    });
    expect(r.ok).toBe(true);
    expect(createMeterEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: "whatsapp_messages",
        payload: expect.objectContaining({
          stripe_customer_id: "cus_123",
          value: "3",
        }),
      })
    );
  });

  it("reportAiUsage usa subscription do tenant", async () => {
    mockBillingSubscription.findUnique.mockResolvedValue({
      stripeCustomerId: "cus_ai",
      stripeSubscriptionId: "sub_1",
      status: "active",
      plan: "PRO",
      messagesIncludedUsed: 0,
      aiIncludedUsed: 2999,
      messagesOverageSent: 0,
      aiOverageSent: 0,
    });
    const { reportAiUsage } = await import("../application/reportAiUsage");
    const r = await reportAiUsage({
      tenantId: "tenant-a",
      quantity: 2,
    });
    expect(r.ok).toBe(true);
    expect(mockBillingSubscription.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "tenant-a" },
      })
    );
    expect(createMeterEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: "ai_usage",
        payload: expect.objectContaining({ stripe_customer_id: "cus_ai", value: "1" }),
      })
    );
  });
});
