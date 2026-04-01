import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../route";
import { NextRequest } from "next/server";
import * as auth from "@/app/api/_helpers/auth";
import * as billingCore from "@devflow/billing-core";
import * as billingAnalytics from "@/modules/billing/billingAnalytics";

vi.mock("@/app/api/_helpers/auth");
vi.mock("@devflow/billing-core", () => ({
  createCheckoutSession: vi.fn(),
}));
vi.mock("@/modules/billing/billingAnalytics", () => ({
  trackCheckoutStarted: vi.fn(),
}));

function makeCheckoutRequest(body: object) {
  return new NextRequest("http://localhost:3000/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/billing/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  });

  it("retorna 401 quando não autenticado", async () => {
    vi.mocked(auth.requireSessionOnly).mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ success: false, error: { message: "Não autenticado" } }), {
        status: 401,
      }),
    });

    const res = await POST(makeCheckoutRequest({ planId: "PRO" }));
    expect(res.status).toBe(401);
  });

  it("cria sessão PRO e retorna checkoutUrl", async () => {
    vi.mocked(auth.requireSessionOnly).mockResolvedValue({
      ok: true,
      userId: "user-1",
      supabaseId: "sb-1",
      email: "u@example.com",
    });
    vi.mocked(billingCore.createCheckoutSession).mockResolvedValue({
      checkoutUrl: "https://checkout.stripe.com/test",
    });

    const res = await POST(makeCheckoutRequest({ planId: "PRO" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.checkoutUrl).toBe("https://checkout.stripe.com/test");
    expect(billingCore.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        planId: "PRO",
        successUrl: expect.stringContaining("/upgrade?success=1&plan=PRO"),
        cancelUrl: expect.stringContaining("/upgrade?cancel=1&plan=PRO"),
      })
    );
    expect(billingAnalytics.trackCheckoutStarted).toHaveBeenCalledWith({
      userId: "user-1",
      planId: "PRO",
    });
  });

  it("aceita TEAM", async () => {
    vi.mocked(auth.requireSessionOnly).mockResolvedValue({
      ok: true,
      userId: "user-2",
      supabaseId: "sb-2",
      email: "t@example.com",
    });
    vi.mocked(billingCore.createCheckoutSession).mockResolvedValue({
      checkoutUrl: "https://checkout.stripe.com/team",
    });

    const res = await POST(makeCheckoutRequest({ planId: "TEAM" }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.checkoutUrl).toContain("stripe.com");
  });

  it("retorna 400 para planId inválido", async () => {
    vi.mocked(auth.requireSessionOnly).mockResolvedValue({
      ok: true,
      userId: "user-1",
      supabaseId: "sb-1",
      email: "u@example.com",
    });

    const res = await POST(makeCheckoutRequest({ planId: "FREE" }));
    expect(res.status).toBe(400);
  });

  it("retorna 503 quando Stripe não configurado", async () => {
    vi.mocked(auth.requireSessionOnly).mockResolvedValue({
      ok: true,
      userId: "user-1",
      supabaseId: "sb-1",
      email: "u@example.com",
    });
    vi.mocked(billingCore.createCheckoutSession).mockRejectedValue(new Error("STRIPE_SECRET_KEY is not set"));

    const res = await POST(makeCheckoutRequest({ planId: "PRO" }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error?.code).toBe("BILLING_NOT_CONFIGURED");
  });
});
