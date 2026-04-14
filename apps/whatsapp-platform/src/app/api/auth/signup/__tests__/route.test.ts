import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: () => ({ ok: true }),
  getClientIp: () => "127.0.0.1",
}));

const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockTenantCreate = vi.hoisted(() => vi.fn());
const mockUserCreate = vi.hoisted(() => vi.fn());
const mockHashPassword = vi.hoisted(() => vi.fn());
const mockSignToken = vi.hoisted(() => vi.fn());
const mockBuildSetCookieHeader = vi.hoisted(() => vi.fn());
const mockCreateUserSession = vi.hoisted(() => vi.fn());
const mockEnsureTenantSubscription = vi.hoisted(() => vi.fn());
const mockSendTransactionalEmail = vi.hoisted(() => vi.fn());
const mockCreateCheckoutSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
      create: (...a: unknown[]) => mockUserCreate(...a),
    },
    tenant: {
      create: (...a: unknown[]) => mockTenantCreate(...a),
    },
  },
}));

vi.mock("@/modules/auth", () => ({
  hashPassword: (...a: unknown[]) => mockHashPassword(...a),
  signToken: (...a: unknown[]) => mockSignToken(...a),
  buildSetCookieHeader: (...a: unknown[]) => mockBuildSetCookieHeader(...a),
}));

vi.mock("@/modules/auth/sessionService", () => ({
  createUserSession: (...a: unknown[]) => mockCreateUserSession(...a),
}));

vi.mock("@/modules/billing/subscriptionService", () => ({
  ensureTenantSubscription: (...a: unknown[]) => mockEnsureTenantSubscription(...a),
}));

vi.mock("@/modules/email/application/sendTransactionalEmail", () => ({
  sendTransactionalEmail: (...a: unknown[]) => mockSendTransactionalEmail(...a),
}));

vi.mock("@devflow/billing-core", () => ({
  createCheckoutSession: (...a: unknown[]) => mockCreateCheckoutSession(...a),
}));

vi.mock("@/lib/auth-logger", () => ({
  logAuth: vi.fn(),
}));

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_WHATSAPP_APP_URL = "http://localhost:3000";
    mockUserFindUnique.mockResolvedValue(null);
    mockTenantCreate.mockResolvedValue({
      id: "t-new",
      name: "João Silva",
      plan: "free",
    });
    mockUserCreate.mockResolvedValue({
      id: "u-new",
      email: "joao@example.com",
      name: "João Silva",
      role: "manager",
      tenantId: "t-new",
    });
    mockHashPassword.mockResolvedValue("hashed-secret");
    mockSignToken.mockResolvedValue("jwt-token");
    mockBuildSetCookieHeader.mockReturnValue("session=abc; Path=/; HttpOnly");
    mockCreateUserSession.mockResolvedValue({ sessionId: "sess-1" });
    mockEnsureTenantSubscription.mockResolvedValue(undefined);
    mockSendTransactionalEmail.mockResolvedValue({ ok: true, provider: "resend" });
    mockCreateCheckoutSession.mockReset();
  });

  it("cria conta, chama sendTransactionalEmail com ACCOUNT_CREATED e responde 200", async () => {
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "João Silva",
        email: "Joao@Example.com",
        password: "12345678",
        planId: "free",
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success?: boolean;
      user?: { id: string; email: string; tenantId: string };
      redirectTo?: string;
    };
    expect(body.success).toBe(true);
    expect(body.user?.email).toBe("joao@example.com");
    expect(body.user?.tenantId).toBe("t-new");
    expect(body.redirectTo).toBe("/onboarding");
    expect(res.headers.get("Set-Cookie")).toBeTruthy();

    expect(mockSendTransactionalEmail).toHaveBeenCalledTimes(1);
    expect(mockSendTransactionalEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ACCOUNT_CREATED",
        to: "joao@example.com",
        tenantId: "t-new",
        userId: "u-new",
        payload: expect.objectContaining({
          userName: "João Silva",
          email: "joao@example.com",
          loginUrl: "http://localhost:3000/login",
        }),
      })
    );
  });

  it("mantém sucesso HTTP quando sendTransactionalEmail falha (só regista erro)", async () => {
    mockSendTransactionalEmail.mockResolvedValue({
      ok: false,
      provider: "resend",
      errorCode: "EMAIL_SEND_FAILED",
    });
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Maria",
        email: "maria@example.com",
        password: "12345678",
        planId: "free",
      }),
      headers: { "Content-Type": "application/json" },
    });
    mockUserCreate.mockResolvedValue({
      id: "u-maria",
      email: "maria@example.com",
      name: "Maria",
      role: "manager",
      tenantId: "t-new",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success?: boolean };
    expect(body.success).toBe(true);
    expect(mockSendTransactionalEmail).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ACCOUNT_CREATED", to: "maria@example.com" })
    );
  });

  it("com planId pro devolve redirectUrl do createCheckoutSession (onboarding comercial)", async () => {
    const checkoutUrl = "https://checkout.stripe.com/cpay/cs_test_integration";
    mockCreateCheckoutSession.mockResolvedValue({ checkoutUrl });

    mockTenantCreate.mockResolvedValue({
      id: "t-pro",
      name: "Cliente Pro",
      plan: "pro",
    });
    mockUserCreate.mockResolvedValue({
      id: "u-pro",
      email: "cliente.pro@example.com",
      name: "Cliente Pro",
      role: "manager",
      tenantId: "t-pro",
    });

    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Cliente Pro",
        email: "cliente.pro@example.com",
        password: "12345678",
        planId: "pro",
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success?: boolean;
      redirectUrl?: string;
      redirectTo?: string;
      user?: { email: string; tenantId: string; name: string };
    };

    expect(body.success).toBe(true);
    expect(body.redirectUrl).toBe(checkoutUrl);
    expect(body.redirectTo).toBeUndefined();
    expect(body.user?.email).toBe("cliente.pro@example.com");
    expect(body.user?.tenantId).toBe("t-pro");
    expect(body.user?.name).toBe("Cliente Pro");
    expect(res.headers.get("Set-Cookie")).toBeTruthy();

    expect(mockCreateCheckoutSession).toHaveBeenCalledTimes(1);
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "t-pro",
        email: "cliente.pro@example.com",
        planId: "PRO",
        successUrl: "http://localhost:3000/onboarding?session_id={CHECKOUT_SESSION_ID}",
        cancelUrl: "http://localhost:3000/signup?cancel=1",
      })
    );

    expect(mockSendTransactionalEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ACCOUNT_CREATED",
        to: "cliente.pro@example.com",
        tenantId: "t-pro",
      })
    );
  });
});
