import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@devflow/billing-core", () => ({
  validateWebhook: vi.fn(),
}));

vi.mock("@/modules/billing/stripeWebhookProcessor", () => ({
  processStripeWebhookEventWithIdempotency: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "../route";
import { validateWebhook } from "@devflow/billing-core";
import { processStripeWebhookEventWithIdempotency } from "@/modules/billing/stripeWebhookProcessor";

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
    vi.mocked(processStripeWebhookEventWithIdempotency).mockResolvedValue(undefined);
  });

  it("retorna 400 quando stripe-signature está ausente", async () => {
    const req = new Request("http://localhost/api/billing/webhook", {
      method: "POST",
      body: "{}",
    });
    const res = await POST(req as Parameters<typeof POST>[0]);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Missing stripe-signature");
    expect(processStripeWebhookEventWithIdempotency).not.toHaveBeenCalled();
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
    expect(processStripeWebhookEventWithIdempotency).not.toHaveBeenCalled();
  });

  it("retorna 200 e delega ao processador com o evento validado", async () => {
    const event = { id: "evt_1", type: "checkout.session.completed" } as Parameters<
      typeof processStripeWebhookEventWithIdempotency
    >[0];
    vi.mocked(validateWebhook).mockReturnValue(event);

    const res = await POST(makeRequest() as Parameters<typeof POST>[0]);

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("OK");
    expect(processStripeWebhookEventWithIdempotency).toHaveBeenCalledTimes(1);
    expect(processStripeWebhookEventWithIdempotency).toHaveBeenCalledWith(event);
  });

  it("retorna 500 quando o processador falha", async () => {
    const event = { id: "evt_2", type: "invoice.paid" } as Parameters<
      typeof processStripeWebhookEventWithIdempotency
    >[0];
    vi.mocked(validateWebhook).mockReturnValue(event);
    vi.mocked(processStripeWebhookEventWithIdempotency).mockRejectedValue(new Error("db down"));

    const res = await POST(makeRequest() as Parameters<typeof POST>[0]);

    expect(res.status).toBe(500);
    expect(await res.text()).toBe("Webhook handler error");
  });
});
