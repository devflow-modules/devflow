import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@devflow/billing-core", () => ({
  validateWebhook: vi.fn(),
  parseWebhookEvent: vi.fn(),
}));

vi.mock("@/modules/billing/BillingService", () => ({
  BillingService: {
    setUserPlan: vi.fn(),
  },
}));

vi.mock("@/modules/billing/BillingProfileRepository", () => ({
  upsertProfile: vi.fn().mockResolvedValue(undefined),
  updateSubscriptionId: vi.fn().mockResolvedValue(undefined),
  clearSubscriptionId: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/modules/billing/billingAnalytics", () => ({
  trackPaymentCompleted: vi.fn(),
  trackSubscriptionCancelled: vi.fn(),
  trackSubscriptionCancelledPortal: vi.fn(),
  trackSubscriptionUpdatedPortal: vi.fn(),
  trackSubscriptionPendingCancellation: vi.fn(),
  trackSubscriptionReactivated: vi.fn(),
  trackCustomerUpdated: vi.fn(),
}));

import { POST } from "../route";
import { validateWebhook, parseWebhookEvent } from "@devflow/billing-core";
import { BillingService } from "@/modules/billing/BillingService";
import * as BillingProfileRepository from "@/modules/billing/BillingProfileRepository";
import * as billingAnalytics from "@/modules/billing/billingAnalytics";

function makeRequest(body = "{}") {
  return new Request("http://localhost/api/billing/webhook", {
    method: "POST",
    headers: { "stripe-signature": "v1,valid" },
    body,
  });
}

describe("POST /api/billing/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(BillingService.setUserPlan).mockResolvedValue(undefined);
    vi.mocked(BillingProfileRepository.upsertProfile).mockResolvedValue(undefined as never);
    vi.mocked(BillingProfileRepository.clearSubscriptionId).mockResolvedValue(undefined);
    vi.mocked(BillingProfileRepository.updateSubscriptionId).mockResolvedValue(undefined);
  });

  // -------------------------------------------------------------------------
  // Validações básicas
  // -------------------------------------------------------------------------
  it("retorna 400 quando stripe-signature está ausente", async () => {
    const req = new Request("http://localhost/api/billing/webhook", {
      method: "POST",
      body: "{}",
    });
    const res = await POST(req as Parameters<typeof POST>[0]);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Missing stripe-signature");
  });

  it("retorna 400 quando assinatura é inválida", async () => {
    vi.mocked(validateWebhook).mockImplementation(() => {
      throw new Error("Invalid signature");
    });
    const res = await POST(
      new Request("http://localhost/api/billing/webhook", {
        method: "POST",
        headers: { "stripe-signature": "v1,xxx" },
        body: "{}",
      }) as Parameters<typeof POST>[0]
    );
    expect(res.status).toBe(400);
  });

  it("retorna 200 quando parseWebhookEvent retorna null", async () => {
    vi.mocked(validateWebhook).mockReturnValue({ type: "ping" } as never);
    vi.mocked(parseWebhookEvent).mockReturnValue(null);

    const res = await POST(makeRequest() as Parameters<typeof POST>[0]);

    expect(res.status).toBe(200);
    expect(BillingService.setUserPlan).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // checkout.session.completed
  // -------------------------------------------------------------------------
  it("atualiza plano e persiste profile em checkout.session.completed", async () => {
    vi.mocked(validateWebhook).mockReturnValue({ type: "checkout.session.completed" } as never);
    vi.mocked(parseWebhookEvent).mockReturnValue({
      type: "checkout.session.completed",
      userId: "user-1",
      planId: "PRO",
      stripeCustomerId: "cus_123",
      subscriptionId: "sub_456",
    });

    const res = await POST(makeRequest() as Parameters<typeof POST>[0]);

    expect(res.status).toBe(200);
    expect(BillingService.setUserPlan).toHaveBeenCalledWith("user-1", "PRO");
    expect(BillingProfileRepository.upsertProfile).toHaveBeenCalledWith("user-1", "cus_123", "sub_456");
    expect(billingAnalytics.trackPaymentCompleted).toHaveBeenCalledWith({ userId: "user-1", planId: "PRO" });
  });

  it("não chama upsertProfile quando stripeCustomerId está ausente no checkout", async () => {
    vi.mocked(validateWebhook).mockReturnValue({ type: "checkout.session.completed" } as never);
    vi.mocked(parseWebhookEvent).mockReturnValue({
      type: "checkout.session.completed",
      userId: "user-1",
      planId: "PRO",
    });

    await POST(makeRequest() as Parameters<typeof POST>[0]);

    expect(BillingProfileRepository.upsertProfile).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // customer.subscription.updated — upgrade/downgrade
  // -------------------------------------------------------------------------
  it("atualiza plano em customer.subscription.updated com planId", async () => {
    vi.mocked(validateWebhook).mockReturnValue({ type: "customer.subscription.updated" } as never);
    vi.mocked(parseWebhookEvent).mockReturnValue({
      type: "customer.subscription.updated",
      userId: "user-1",
      planId: "TEAM",
      stripeCustomerId: "cus_123",
      subscriptionId: "sub_456",
      cancelAtPeriodEnd: false,
    });

    const res = await POST(makeRequest() as Parameters<typeof POST>[0]);

    expect(res.status).toBe(200);
    expect(BillingService.setUserPlan).toHaveBeenCalledWith("user-1", "TEAM");
    expect(billingAnalytics.trackSubscriptionUpdatedPortal).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // cancel_at_period_end = true — cancelamento agendado
  // -------------------------------------------------------------------------
  it("NÃO reverte plano quando cancel_at_period_end é true", async () => {
    vi.mocked(validateWebhook).mockReturnValue({ type: "customer.subscription.updated" } as never);
    vi.mocked(parseWebhookEvent).mockReturnValue({
      type: "customer.subscription.updated",
      userId: "user-1",
      subscriptionId: "sub_456",
      cancelAtPeriodEnd: true,
    });

    const res = await POST(makeRequest() as Parameters<typeof POST>[0]);

    expect(res.status).toBe(200);
    expect(BillingService.setUserPlan).not.toHaveBeenCalled();
    expect(billingAnalytics.trackSubscriptionPendingCancellation).toHaveBeenCalledWith({ userId: "user-1" });
  });

  // -------------------------------------------------------------------------
  // cancel_at_period_end = false sem planId — reativação
  // -------------------------------------------------------------------------
  it("dispara trackSubscriptionReactivated quando cancel_at_period_end volta a false", async () => {
    vi.mocked(validateWebhook).mockReturnValue({ type: "customer.subscription.updated" } as never);
    vi.mocked(parseWebhookEvent).mockReturnValue({
      type: "customer.subscription.updated",
      userId: "user-1",
      subscriptionId: "sub_456",
      cancelAtPeriodEnd: false,
    });

    const res = await POST(makeRequest() as Parameters<typeof POST>[0]);

    expect(res.status).toBe(200);
    expect(BillingService.setUserPlan).not.toHaveBeenCalled();
    expect(billingAnalytics.trackSubscriptionReactivated).toHaveBeenCalledWith({ userId: "user-1" });
  });

  // -------------------------------------------------------------------------
  // customer.subscription.deleted — cancelamento efetivo
  // -------------------------------------------------------------------------
  it("define FREE e limpa subscriptionId em customer.subscription.deleted", async () => {
    vi.mocked(validateWebhook).mockReturnValue({ type: "customer.subscription.deleted" } as never);
    vi.mocked(parseWebhookEvent).mockReturnValue({
      type: "customer.subscription.deleted",
      userId: "user-1",
      stripeCustomerId: "cus_123",
      subscriptionId: "sub_456",
    });

    const res = await POST(makeRequest() as Parameters<typeof POST>[0]);

    expect(res.status).toBe(200);
    expect(BillingService.setUserPlan).toHaveBeenCalledWith("user-1", "FREE");
    expect(BillingProfileRepository.clearSubscriptionId).toHaveBeenCalledWith("user-1");
    expect(billingAnalytics.trackSubscriptionCancelled).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // customer.updated
  // -------------------------------------------------------------------------
  it("dispara trackCustomerUpdated em customer.updated", async () => {
    vi.mocked(validateWebhook).mockReturnValue({ type: "customer.updated" } as never);
    vi.mocked(parseWebhookEvent).mockReturnValue({
      type: "customer.updated",
      stripeCustomerId: "cus_123",
      stripeCustomerEmail: "user@example.com",
    });

    const res = await POST(makeRequest() as Parameters<typeof POST>[0]);

    expect(res.status).toBe(200);
    expect(BillingService.setUserPlan).not.toHaveBeenCalled();
    expect(billingAnalytics.trackCustomerUpdated).toHaveBeenCalledWith({ stripeCustomerId: "cus_123" });
  });

  it("não chama setUserPlan em customer.updated", async () => {
    vi.mocked(validateWebhook).mockReturnValue({ type: "customer.updated" } as never);
    vi.mocked(parseWebhookEvent).mockReturnValue({
      type: "customer.updated",
      stripeCustomerId: "cus_123",
    });

    await POST(makeRequest() as Parameters<typeof POST>[0]);

    expect(BillingService.setUserPlan).not.toHaveBeenCalled();
  });
});
