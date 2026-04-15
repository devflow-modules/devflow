import { describe, it, expect, vi, beforeEach } from "vitest";

const mockTenantUpsert = vi.fn();
const mockTenantUpdateMany = vi.fn();
const mockBillingUpdateMany = vi.fn();
const mockUpsertBillingSubscription = vi.fn();

const mockPrisma = {
  tenantSubscription: { upsert: mockTenantUpsert, updateMany: mockTenantUpdateMany },
  billingSubscription: { updateMany: mockBillingUpdateMany },
  $transaction: vi.fn((arg: unknown) =>
    Array.isArray(arg) ? Promise.all(arg as Promise<unknown>[]) : (arg as (tx: unknown) => Promise<unknown>)(mockPrisma)
  ),
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/billing/infrastructure/billingRepository", () => ({
  upsertBillingSubscription: (...args: unknown[]) => mockUpsertBillingSubscription(...args),
}));

describe("stripeSyncService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTenantUpsert.mockResolvedValue({});
    mockUpsertBillingSubscription.mockResolvedValue(undefined);
    mockTenantUpdateMany.mockResolvedValue({});
    mockBillingUpdateMany.mockResolvedValue({});
  });

  it("syncSubscriptionFromStripe atualiza plan e status", async () => {
    const { syncSubscriptionFromStripe } = await import("../stripeSyncService");
    const subscription = {
      id: "sub_123",
      status: "active",
      metadata: { plan: "PRO", tenantId: "t1" },
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
      cancel_at_period_end: false,
      customer: "cus_123",
    } as never;

    await syncSubscriptionFromStripe("t1", "cus_123", subscription);

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockUpsertBillingSubscription).toHaveBeenCalledWith("t1", expect.objectContaining({
      plan: "OPERATIONAL_BASE",
      status: "active",
      stripeSubscriptionId: "sub_123",
    }));
    expect(mockTenantUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "t1" },
        create: expect.objectContaining({
          tenantId: "t1",
          plan: "OPERATIONAL_BASE",
          status: "ACTIVE",
          stripeCustomerId: "cus_123",
          stripeSubscriptionId: "sub_123",
        }),
      })
    );
  });

  it("syncSubscriptionFromStripe com subscription null define CANCELED", async () => {
    const { syncSubscriptionFromStripe } = await import("../stripeSyncService");

    await syncSubscriptionFromStripe("t1", null, null);

    expect(mockTenantUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          plan: "FREE",
          status: "CANCELED",
        }),
      })
    );
  });

  it("syncSubscriptionFromStripe mapeia past_due para PAST_DUE", async () => {
    const { syncSubscriptionFromStripe } = await import("../stripeSyncService");
    const subscription = {
      id: "sub_456",
      status: "past_due",
      metadata: { plan: "PRO", tenantId: "t2" },
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
      cancel_at_period_end: false,
      customer: "cus_456",
    } as never;

    await syncSubscriptionFromStripe("t2", "cus_456", subscription);

    expect(mockTenantUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          plan: "OPERATIONAL_BASE",
          status: "PAST_DUE",
        }),
      })
    );
  });

  it("markSubscriptionPastDue atualiza status para PAST_DUE", async () => {
    const { markSubscriptionPastDue } = await import("../stripeSyncService");

    await markSubscriptionPastDue("cus_789");

    expect(mockTenantUpdateMany).toHaveBeenCalledWith({
      where: { stripeCustomerId: "cus_789" },
      data: { status: "PAST_DUE" },
    });
    expect(mockBillingUpdateMany).toHaveBeenCalledWith({
      where: { stripeCustomerId: "cus_789" },
      data: { status: "past_due" },
    });
  });
});
