import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../route";
import { NextRequest } from "next/server";
import * as auth from "@/app/api/_helpers/auth";
import * as BillingPortalService from "@/modules/billing/BillingPortalService";
import * as billingAnalytics from "@/modules/billing/billingAnalytics";

vi.mock("@/app/api/_helpers/auth");
vi.mock("@/modules/billing/BillingPortalService");
vi.mock("@/modules/billing/billingAnalytics", () => ({
  trackCustomerPortalOpened: vi.fn(),
  trackSubscriptionManageClicked: vi.fn(),
}));

function makeRequest(url = "http://localhost:3000/api/billing/customer-portal") {
  return new NextRequest(url, { method: "POST" });
}

describe("POST /api/billing/customer-portal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 401 quando não autenticado", async () => {
    vi.mocked(auth.requireSessionOnly).mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ message: "Não autenticado" }), { status: 401 }),
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("retorna portalUrl quando autenticado com perfil válido", async () => {
    vi.mocked(auth.requireSessionOnly).mockResolvedValue({
      ok: true,
      userId: "user-1",
      supabaseId: "sb-1",
      email: "user@example.com",
    });
    vi.mocked(BillingPortalService.openCustomerPortal).mockResolvedValue({
      ok: true,
      portalUrl: "https://billing.stripe.com/portal_xxx",
    });

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.portalUrl).toBe("https://billing.stripe.com/portal_xxx");
    expect(billingAnalytics.trackCustomerPortalOpened).toHaveBeenCalledWith({ userId: "user-1" });
  });

  it("retorna 404 quando perfil não encontrado", async () => {
    vi.mocked(auth.requireSessionOnly).mockResolvedValue({
      ok: true,
      userId: "user-1",
      supabaseId: "sb-1",
      email: "user@example.com",
    });
    vi.mocked(BillingPortalService.openCustomerPortal).mockResolvedValue({
      ok: false,
      error: "BILLING_PROFILE_NOT_FOUND",
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("BILLING_PROFILE_NOT_FOUND");
  });

  it("retorna 404 quando customer Stripe não encontrado", async () => {
    vi.mocked(auth.requireSessionOnly).mockResolvedValue({
      ok: true,
      userId: "user-1",
      supabaseId: "sb-1",
      email: "user@example.com",
    });
    vi.mocked(BillingPortalService.openCustomerPortal).mockResolvedValue({
      ok: false,
      error: "STRIPE_CUSTOMER_NOT_FOUND",
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(404);
  });

  it("retorna 500 em erro interno", async () => {
    vi.mocked(auth.requireSessionOnly).mockResolvedValue({
      ok: true,
      userId: "user-1",
      supabaseId: "sb-1",
      email: "user@example.com",
    });
    vi.mocked(BillingPortalService.openCustomerPortal).mockResolvedValue({
      ok: false,
      error: "INTERNAL_ERROR",
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
  });

  it("não chama trackCustomerPortalOpened em caso de erro", async () => {
    vi.mocked(auth.requireSessionOnly).mockResolvedValue({
      ok: true,
      userId: "user-1",
      supabaseId: "sb-1",
      email: "user@example.com",
    });
    vi.mocked(BillingPortalService.openCustomerPortal).mockResolvedValue({
      ok: false,
      error: "BILLING_PROFILE_NOT_FOUND",
    });

    await POST(makeRequest());
    expect(billingAnalytics.trackCustomerPortalOpened).not.toHaveBeenCalled();
  });
});
