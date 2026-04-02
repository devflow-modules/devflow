import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("retorna 400 quando stripe-signature está ausente", async () => {
    vi.stubEnv("NEXT_PUBLIC_FINANCEIRO_APP_URL", "http://localhost:3001");
    const req = new Request("http://localhost/api/billing/webhook", {
      method: "POST",
      body: "{}",
    });
    const res = await POST(req as Parameters<typeof POST>[0]);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Missing stripe-signature");
  });

  describe("proxy para apps/financeiro (NEXT_PUBLIC_FINANCEIRO_APP_URL definido)", () => {
    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_FINANCEIRO_APP_URL", "http://localhost:3001");
    });

    it("encaminha corpo e stripe-signature para o app e devolve a resposta", async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response("OK", { status: 200 }));
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const res = await POST(makeRequest('{"x":1}') as Parameters<typeof POST>[0]);

      expect(res.status).toBe(200);
      expect(await res.text()).toBe("OK");
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:3001/api/billing/webhook");
      expect(init.method).toBe("POST");
      expect(init.headers).toMatchObject({
        "stripe-signature": "v1,valid",
        "Content-Type": "application/json",
      });
      expect(init.body).toBe('{"x":1}');
      expect(validateWebhook).not.toHaveBeenCalled();
    });

    it("propaga status e corpo quando o app responde erro", async () => {
      globalThis.fetch = vi
        .fn()
        .mockResolvedValue(new Response("Invalid signature", { status: 400 })) as unknown as typeof fetch;

      const res = await POST(makeRequest() as Parameters<typeof POST>[0]);

      expect(res.status).toBe(400);
      expect(await res.text()).toBe("Invalid signature");
    });

    it("não chama BillingService no portal", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(new Response("OK", { status: 200 })) as unknown as typeof fetch;

      await POST(makeRequest() as Parameters<typeof POST>[0]);

      expect(BillingService.setUserPlan).not.toHaveBeenCalled();
    });
  });

  describe("legado sem URL do app (processamento na raiz)", () => {
    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_FINANCEIRO_APP_URL", "");
      vi.mocked(BillingService.setUserPlan).mockResolvedValue(undefined);
      vi.mocked(BillingProfileRepository.upsertProfile).mockResolvedValue(undefined as never);
      vi.mocked(BillingProfileRepository.clearSubscriptionId).mockResolvedValue(undefined);
      vi.mocked(BillingProfileRepository.updateSubscriptionId).mockResolvedValue(undefined);
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
  });
});
