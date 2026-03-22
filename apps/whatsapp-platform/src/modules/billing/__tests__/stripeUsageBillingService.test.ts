import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreateMeterEvent = vi.fn();
const mockGetBillingSubscriptionByTenant = vi.fn();
const mockCreateBillingAuditLog = vi.fn();

vi.mock("../infrastructure/stripeMeterClient", () => ({
  createMeterEvent: (...a: unknown[]) => mockCreateMeterEvent(...a),
  METER_EVENT_AI_RESPONSES: "ai_responses",
}));
vi.mock("../infrastructure/billingRepository", () => ({
  getBillingSubscriptionByTenant: (...a: unknown[]) =>
    mockGetBillingSubscriptionByTenant(...a),
}));
vi.mock("../infrastructure/billingAuditRepository", () => ({
  createBillingAuditLog: (...a: unknown[]) => mockCreateBillingAuditLog(...a),
}));

const mockBillingAuditLogFindFirst = vi.fn();
const mockTenantFindUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    billingAuditLog: {
      findFirst: (...a: unknown[]) => mockBillingAuditLogFindFirst(...a),
    },
    tenant: {
      findUnique: (...a: unknown[]) => mockTenantFindUnique(...a),
    },
  },
}));

describe("stripeUsageBillingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBillingSubscriptionByTenant.mockResolvedValue({
      stripeCustomerId: "cus_pro123",
    });
    mockBillingAuditLogFindFirst.mockResolvedValue(null);
    mockCreateMeterEvent.mockResolvedValue({ ok: true });
  });

  it("não cobra excedente no plano Starter", async () => {
    const { billAiOverageIfApplicable } = await import(
      "../stripeUsageBillingService"
    );
    await billAiOverageIfApplicable({
      tenantId: "t1",
      messageId: "wamid.xxx",
      used: 150,
      limit: 100,
      plan: "STARTER",
    });
    expect(mockCreateMeterEvent).not.toHaveBeenCalled();
  });

  it("não cobra excedente no plano FREE", async () => {
    const { billAiOverageIfApplicable } = await import(
      "../stripeUsageBillingService"
    );
    await billAiOverageIfApplicable({
      tenantId: "t1",
      messageId: "wamid.xxx",
      used: 20,
      limit: 10,
      plan: "FREE",
    });
    expect(mockCreateMeterEvent).not.toHaveBeenCalled();
  });

  it("não cobra quando used < limit (Pro)", async () => {
    const { billAiOverageIfApplicable } = await import(
      "../stripeUsageBillingService"
    );
    await billAiOverageIfApplicable({
      tenantId: "t1",
      messageId: "wamid.xxx",
      used: 50,
      limit: 750,
      plan: "PRO",
    });
    expect(mockCreateMeterEvent).not.toHaveBeenCalled();
  });

  it("cobra excedente no Pro quando used >= limit", async () => {
    const { billAiOverageIfApplicable } = await import(
      "../stripeUsageBillingService"
    );
    await billAiOverageIfApplicable({
      tenantId: "t1",
      messageId: "wamid.overage1",
      used: 750,
      limit: 750,
      plan: "PRO",
    });
    expect(mockCreateMeterEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "ai_responses",
        stripeCustomerId: "cus_pro123",
        value: 1,
        identifier: expect.stringContaining("wamid.overage1"),
      })
    );
    expect(mockCreateBillingAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "t1",
        eventType: "AI_OVERAGE_METER_SENT",
        source: "usage",
        referenceId: expect.stringContaining("wamid.overage1"),
      })
    );
  });

  it("cobra excedente no Scale quando used >= limit", async () => {
    mockGetBillingSubscriptionByTenant.mockResolvedValue({
      stripeCustomerId: "cus_scale456",
    });
    const { billAiOverageIfApplicable } = await import(
      "../stripeUsageBillingService"
    );
    await billAiOverageIfApplicable({
      tenantId: "t2",
      messageId: "wamid.scale_over",
      used: 3001,
      limit: 3000,
      plan: "SCALE",
    });
    expect(mockCreateMeterEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "ai_responses",
        stripeCustomerId: "cus_scale456",
        value: 1,
      })
    );
  });

  it("idempotência evita duplicata — já faturado", async () => {
    mockBillingAuditLogFindFirst.mockResolvedValue({ id: "existing" });
    const { billAiOverageIfApplicable } = await import(
      "../stripeUsageBillingService"
    );
    await billAiOverageIfApplicable({
      tenantId: "t1",
      messageId: "wamid.duplicate",
      used: 100,
      limit: 100,
      plan: "PRO",
    });
    expect(mockCreateMeterEvent).not.toHaveBeenCalled();
  });

  it("falha Stripe não quebra — apenas loga", async () => {
    mockCreateMeterEvent.mockResolvedValue({ ok: false, error: "Stripe error" });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { billAiOverageIfApplicable } = await import(
      "../stripeUsageBillingService"
    );
    await billAiOverageIfApplicable({
      tenantId: "t1",
      messageId: "wamid.fail",
      used: 751,
      limit: 750,
      plan: "PRO",
    });
    expect(mockCreateBillingAuditLog).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("sem stripeCustomerId — skip sem throw", async () => {
    mockGetBillingSubscriptionByTenant.mockResolvedValue(null);
    mockTenantFindUnique.mockResolvedValue({ stripeCustomerId: null });
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { billAiOverageIfApplicable } = await import(
      "../stripeUsageBillingService"
    );
    await billAiOverageIfApplicable({
      tenantId: "t1",
      messageId: "wamid.nocust",
      used: 101,
      limit: 100,
      plan: "PRO",
    });
    expect(mockCreateMeterEvent).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
