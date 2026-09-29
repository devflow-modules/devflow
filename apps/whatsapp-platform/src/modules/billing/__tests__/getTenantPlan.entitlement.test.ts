import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindUnique = vi.fn();
const mockTenantFind = vi.fn();
const mockBillingFind = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenantSubscription: { findUnique: (...a: unknown[]) => mockFindUnique(...a) },
    billingSubscription: { findUnique: (...a: unknown[]) => mockBillingFind(...a) },
    tenant: { findUnique: (...a: unknown[]) => mockTenantFind(...a) },
  },
}));

describe("getTenantPlan entitlement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockFindUnique.mockResolvedValue(null);
    mockBillingFind.mockResolvedValue(null);
    mockTenantFind.mockResolvedValue({ plan: "FREE" });
  });

  it("past_due BillingSubscription with PRO plan → FREE (not paid)", async () => {
    mockBillingFind.mockResolvedValue({ plan: "PRO", status: "past_due" });
    const { getTenantPlan } = await import("../subscriptionService");
    await expect(getTenantPlan("t1")).resolves.toBe("FREE");
  });

  it("canceled BillingSubscription with PRO → FREE", async () => {
    mockBillingFind.mockResolvedValue({ plan: "PRO", status: "canceled" });
    const { getTenantPlan } = await import("../subscriptionService");
    await expect(getTenantPlan("t1")).resolves.toBe("FREE");
  });

  it("unpaid BillingSubscription with SCALE → FREE", async () => {
    mockBillingFind.mockResolvedValue({ plan: "SCALE", status: "unpaid" });
    const { getTenantPlan } = await import("../subscriptionService");
    await expect(getTenantPlan("t1")).resolves.toBe("FREE");
  });

  it("active BillingSubscription PRO → OPERATIONAL_BASE", async () => {
    mockBillingFind.mockResolvedValue({ plan: "PRO", status: "active" });
    const { getTenantPlan } = await import("../subscriptionService");
    await expect(getTenantPlan("t1")).resolves.toBe("OPERATIONAL_BASE");
  });

  it("trialing BillingSubscription → OPERATIONAL_BASE", async () => {
    mockBillingFind.mockResolvedValue({ plan: "PRO", status: "trialing" });
    const { getTenantPlan } = await import("../subscriptionService");
    await expect(getTenantPlan("t1")).resolves.toBe("OPERATIONAL_BASE");
  });

  it("TenantSubscription PAST_DUE falls through to entitled billing", async () => {
    mockFindUnique.mockResolvedValue({ plan: "SCALE", status: "PAST_DUE" });
    mockBillingFind.mockResolvedValue({ plan: "PRO", status: "active" });
    const { getTenantPlan } = await import("../subscriptionService");
    await expect(getTenantPlan("t1")).resolves.toBe("OPERATIONAL_BASE");
  });

  it("TenantSubscription ACTIVE wins over billing", async () => {
    mockFindUnique.mockResolvedValue({ plan: "SCALE", status: "ACTIVE" });
    mockBillingFind.mockResolvedValue({ plan: "PRO", status: "active" });
    const { getTenantPlan } = await import("../subscriptionService");
    await expect(getTenantPlan("t1")).resolves.toBe("OPERATIONAL_BASE");
  });

  it("incomplete status fail-closed → FREE", async () => {
    mockBillingFind.mockResolvedValue({ plan: "PRO", status: "incomplete" });
    const { getTenantPlan } = await import("../subscriptionService");
    await expect(getTenantPlan("t1")).resolves.toBe("FREE");
  });
});
