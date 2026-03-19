import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UsageEventType } from "@/generated/prisma-whatsapp";

const createUsageRecord = vi.fn().mockResolvedValue({});

vi.mock("stripe", () => ({
  default: class {
    subscriptions = {
      retrieve: vi.fn().mockResolvedValue({
        id: "sub_1",
        items: {
          data: [
            { id: "si_msg", price: { id: "price_msg" } },
            { id: "si_ai", price: { id: "price_ai" } },
          ],
        },
      }),
    };
    subscriptionItems = {
      create: vi.fn().mockResolvedValue({ id: "si_new" }),
      createUsageRecord: (...args: unknown[]) => createUsageRecord(...args),
    };
  },
}));

const mockPrisma = {
  billingSubscription: {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
  usageEvent: {
    update: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

describe("stripeMeteredService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("STRIPE_METERED_PRICE_MESSAGES", "price_msg");
    vi.stubEnv("STRIPE_METERED_PRICE_AI", "price_ai");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
    mockPrisma.billingSubscription.findUnique.mockResolvedValue({
      stripeSubscriptionId: "sub_1",
      status: "active",
      stripeSubscriptionItemMsgId: "si_msg",
      stripeSubscriptionItemAiId: "si_ai",
    });
    mockPrisma.usageEvent.update.mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reportUsageToStripe chama createUsageRecord com idempotency key", async () => {
    const { reportUsageToStripe } = await import("../stripeMeteredService");
    const r = await reportUsageToStripe({
      tenantId: "t1",
      type: UsageEventType.MESSAGE_SENT,
      quantity: 1,
      usageEventId: "evt-uuid-1",
    });
    expect(r.ok).toBe(true);
    expect(createUsageRecord).toHaveBeenCalled();
    const call = createUsageRecord.mock.calls[0];
    expect(call[2]?.idempotencyKey).toBe("wplat-usage-evt-uuid-1");
  });

  it("isolamento: usa subscription do tenant", async () => {
    const { reportUsageToStripe } = await import("../stripeMeteredService");
    await reportUsageToStripe({
      tenantId: "tenant-a",
      type: UsageEventType.AI_RESPONSE,
      quantity: 2,
      usageEventId: "e2",
    });
    expect(mockPrisma.billingSubscription.findUnique).toHaveBeenCalledWith({
      where: { tenantId: "tenant-a" },
    });
  });
});
