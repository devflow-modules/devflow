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

vi.mock("@/modules/billing/billingAnalytics", () => ({
  trackPaymentCompleted: vi.fn(),
  trackSubscriptionCancelled: vi.fn(),
}));

import { POST } from "../route";
import { validateWebhook, parseWebhookEvent } from "@/modules/billing/adapters/payment/StripeAdapter";
import { BillingService } from "@/modules/billing/BillingService";

describe("POST /api/billing/webhook", () => {
  beforeEach(() => {
    vi.mocked(validateWebhook).mockReset();
    vi.mocked(parseWebhookEvent).mockReset();
    vi.mocked(BillingService.setUserPlan).mockResolvedValue(undefined);
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

  it("retorna 200 e atualiza plano em checkout.session.completed", async () => {
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
    const res = await POST(req as Parameters<typeof POST>[0]);

    expect(res.status).toBe(200);
    expect(BillingService.setUserPlan).toHaveBeenCalledWith("user-1", "PRO");
  });

  it("retorna 200 e define FREE em customer.subscription.deleted", async () => {
    const fakeEvent = { type: "customer.subscription.deleted", data: {} };
    vi.mocked(validateWebhook).mockReturnValue(fakeEvent as never);
    vi.mocked(parseWebhookEvent).mockReturnValue({
      type: "customer.subscription.deleted",
      userId: "user-1",
    });

    const req = new Request("http://localhost/api/billing/webhook", {
      method: "POST",
      headers: { "stripe-signature": "v1,valid" },
      body: "{}",
    });
    const res = await POST(req as Parameters<typeof POST>[0]);

    expect(res.status).toBe(200);
    expect(BillingService.setUserPlan).toHaveBeenCalledWith("user-1", "FREE");
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
