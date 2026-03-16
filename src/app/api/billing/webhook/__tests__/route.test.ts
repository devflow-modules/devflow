import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/billing/adapters/payment/StripeAdapter", () => ({
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
}));

import { POST } from "../route";
import { validateWebhook, parseWebhookEvent } from "@/modules/billing/adapters/payment/StripeAdapter";
import { BillingService } from "@/modules/billing/BillingService";
import * as BillingProfileRepository from "@/modules/billing/BillingProfileRepository";

describe("POST /api/billing/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateWebhook).mockReset();
    vi.mocked(parseWebhookEvent).mockReset();
    vi.mocked(BillingService.setUserPlan).mockResolvedValue(undefined);
    vi.mocked(BillingProfileRepository.upsertProfile).mockResolvedValue(undefined as never);
    vi.mocked(BillingProfileRepository.clearSubscriptionId).mockResolvedValue(undefined);
  });

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
    const req = new Request("http://localhost/api/billing/webhook", {
      method: "POST",
      headers: { "stripe-signature": "v1,xxx" },
      body: "{}",
    });
    const res = await POST(req as Parameters<typeof POST>[0]);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Invalid signature");
  });

  it("atualiza plano e persiste profile em checkout.session.completed", async () => {
    const fakeEvent = { type: "checkout.session.completed", data: {} };
    vi.mocked(validateWebhook).mockReturnValue(fakeEvent as never);
    vi.mocked(parseWebhookEvent).mockReturnValue({
      type: "checkout.session.completed",
      userId: "user-1",
      planId: "PRO",
      stripeCustomerId: "cus_123",
      subscriptionId: "sub_456",
    });

    const req = new Request("http://localhost/api/billing/webhook", {
      method: "POST",
      headers: { "stripe-signature": "v1,valid" },
      body: "{}",
    });
    const res = await POST(req as Parameters<typeof POST>[0]);

    expect(res.status).toBe(200);
    expect(BillingService.setUserPlan).toHaveBeenCalledWith("user-1", "PRO");
    expect(BillingProfileRepository.upsertProfile).toHaveBeenCalledWith(
      "user-1",
      "cus_123",
      "sub_456"
    );
  });

  it("não chama upsertProfile quando stripeCustomerId está ausente", async () => {
    const fakeEvent = { type: "checkout.session.completed", data: {} };
    vi.mocked(validateWebhook).mockReturnValue(fakeEvent as never);
    vi.mocked(parseWebhookEvent).mockReturnValue({
      type: "checkout.session.completed",
      userId: "user-1",
      planId: "PRO",
    });

    const req = new Request("http://localhost/api/billing/webhook", {
      method: "POST",
      headers: { "stripe-signature": "v1,valid" },
      body: "{}",
    });
    await POST(req as Parameters<typeof POST>[0]);

    expect(BillingProfileRepository.upsertProfile).not.toHaveBeenCalled();
  });

  it("define FREE e limpa subscriptionId em customer.subscription.deleted", async () => {
    const fakeEvent = { type: "customer.subscription.deleted", data: {} };
    vi.mocked(validateWebhook).mockReturnValue(fakeEvent as never);
    vi.mocked(parseWebhookEvent).mockReturnValue({
      type: "customer.subscription.deleted",
      userId: "user-1",
      stripeCustomerId: "cus_123",
      subscriptionId: "sub_456",
    });

    const req = new Request("http://localhost/api/billing/webhook", {
      method: "POST",
      headers: { "stripe-signature": "v1,valid" },
      body: "{}",
    });
    const res = await POST(req as Parameters<typeof POST>[0]);

    expect(res.status).toBe(200);
    expect(BillingService.setUserPlan).toHaveBeenCalledWith("user-1", "FREE");
    expect(BillingProfileRepository.clearSubscriptionId).toHaveBeenCalledWith("user-1");
  });

  it("retorna 200 quando parseWebhookEvent retorna null", async () => {
    vi.mocked(validateWebhook).mockReturnValue({ type: "ping" } as never);
    vi.mocked(parseWebhookEvent).mockReturnValue(null);
    vi.mocked(BillingService.setUserPlan).mockClear();

    const req = new Request("http://localhost/api/billing/webhook", {
      method: "POST",
      headers: { "stripe-signature": "v1,valid" },
      body: "{}",
    });
    const res = await POST(req as Parameters<typeof POST>[0]);

    expect(res.status).toBe(200);
    expect(BillingService.setUserPlan).not.toHaveBeenCalled();
  });
});
