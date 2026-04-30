import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: () => ({ ok: true }),
  getClientIp: () => "127.0.0.1",
}));

const VALID_AFFILIATE_CUID = "cjld2cjxh0000qzrmn831ir4";

const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockTenantCreate = vi.hoisted(() => vi.fn());
const mockAffiliateFindUnique = vi.hoisted(() => vi.fn());
const mockRecordPlatformAudit = vi.hoisted(() => vi.fn());
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
    affiliate: {
      findUnique: (...a: unknown[]) => mockAffiliateFindUnique(...a),
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

vi.mock("@/lib/platformAuditLog", () => ({
  recordPlatformAudit: (...a: unknown[]) => mockRecordPlatformAudit(...a),
}));

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "SAAS");
    process.env.NEXT_PUBLIC_WHATSAPP_APP_URL = "http://localhost:3000";
    mockAffiliateFindUnique.mockResolvedValue(null);
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

  afterEach(() => {
    vi.unstubAllEnvs();
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

  it("com affiliateRef válido no body vincula tenant e regista auditoria", async () => {
    mockAffiliateFindUnique.mockResolvedValue({ id: VALID_AFFILIATE_CUID });
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Parceiro",
        email: "parceiro@example.com",
        password: "12345678",
        planId: "free",
        affiliateRef: VALID_AFFILIATE_CUID,
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockAffiliateFindUnique).toHaveBeenCalledWith({
      where: { id: VALID_AFFILIATE_CUID },
      select: { id: true },
    });
    expect(mockTenantCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          affiliateId: VALID_AFFILIATE_CUID,
          affiliateSource: "ref",
        }),
      })
    );
    expect(mockRecordPlatformAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "affiliate.assigned",
        tenantId: "t-new",
        metadata: expect.objectContaining({
          affiliateId: VALID_AFFILIATE_CUID,
          source: "ref",
          via: "body",
        }),
      })
    );
  });

  it("sem ref não consulta afiliado nem audita vínculo", async () => {
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Só",
        email: "so@example.com",
        password: "12345678",
        planId: "free",
      }),
      headers: { "Content-Type": "application/json" },
    });
    mockUserCreate.mockResolvedValue({
      id: "u-so",
      email: "so@example.com",
      name: "Só",
      role: "manager",
      tenantId: "t-new",
    });
    await POST(req);
    expect(mockAffiliateFindUnique).not.toHaveBeenCalled();
    const createArg = mockTenantCreate.mock.calls[0]?.[0] as { data: { affiliateId?: string } };
    expect(createArg.data.affiliateId).toBeUndefined();
    expect(mockRecordPlatformAudit).not.toHaveBeenCalled();
  });

  it("ref inválido no body é ignorado", async () => {
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "X",
        email: "x@example.com",
        password: "12345678",
        planId: "free",
        affiliateRef: "não-é-cuid",
      }),
      headers: { "Content-Type": "application/json" },
    });
    mockUserCreate.mockResolvedValue({
      id: "u-x",
      email: "x@example.com",
      name: "X",
      role: "manager",
      tenantId: "t-new",
    });
    await POST(req);
    expect(mockAffiliateFindUnique).not.toHaveBeenCalled();
    const createArg = mockTenantCreate.mock.calls[0]?.[0] as { data: { affiliateId?: string } };
    expect(createArg.data.affiliateId).toBeUndefined();
  });

  it("fallback: cookie affiliate_ref quando body não traz ref", async () => {
    mockAffiliateFindUnique.mockResolvedValue({ id: VALID_AFFILIATE_CUID });
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Cookie",
        email: "cookie@example.com",
        password: "12345678",
        planId: "free",
      }),
      headers: {
        "Content-Type": "application/json",
        cookie: `affiliate_ref=${VALID_AFFILIATE_CUID}`,
      },
    });
    mockUserCreate.mockResolvedValue({
      id: "u-c",
      email: "cookie@example.com",
      name: "Cookie",
      role: "manager",
      tenantId: "t-new",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockAffiliateFindUnique).toHaveBeenCalled();
    expect(mockTenantCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ affiliateId: VALID_AFFILIATE_CUID }),
      })
    );
    expect(mockRecordPlatformAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ via: "cookie" }),
      })
    );
  });

  it("afiliado inexistente na base não grava affiliateId", async () => {
    mockAffiliateFindUnique.mockResolvedValue(null);
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Y",
        email: "y@example.com",
        password: "12345678",
        planId: "free",
        affiliateRef: VALID_AFFILIATE_CUID,
      }),
      headers: { "Content-Type": "application/json" },
    });
    mockUserCreate.mockResolvedValue({
      id: "u-y",
      email: "y@example.com",
      name: "Y",
      role: "manager",
      tenantId: "t-new",
    });
    await POST(req);
    expect(mockAffiliateFindUnique).toHaveBeenCalled();
    const createArg = mockTenantCreate.mock.calls[0]?.[0] as { data: { affiliateId?: string } };
    expect(createArg.data.affiliateId).toBeUndefined();
    expect(mockRecordPlatformAudit).not.toHaveBeenCalled();
  });

  it("body válido prevalece sobre cookie quando ambos presentes", async () => {
    const bodyId = VALID_AFFILIATE_CUID;
    const cookieId = "ckfqz8q3q0000q3q3q3q3q3q3";
    mockAffiliateFindUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve({ id: where.id })
    );
    const { POST } = await import("../route");
    const req = new NextRequest("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Dois",
        email: "dois@example.com",
        password: "12345678",
        planId: "free",
        affiliateRef: bodyId,
      }),
      headers: {
        "Content-Type": "application/json",
        cookie: `affiliate_ref=${cookieId}`,
      },
    });
    mockUserCreate.mockResolvedValue({
      id: "u-2",
      email: "dois@example.com",
      name: "Dois",
      role: "manager",
      tenantId: "t-new",
    });
    await POST(req);
    expect(mockAffiliateFindUnique).toHaveBeenCalledWith({
      where: { id: bodyId },
      select: { id: true },
    });
    const createArg = mockTenantCreate.mock.calls[0]?.[0] as { data: { affiliateId?: string } };
    expect(createArg.data.affiliateId).toBe(bodyId);
    expect(mockRecordPlatformAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ via: "body" }),
      })
    );
  });

  describe("WHITE_LABEL", () => {
    beforeEach(() => {
      vi.resetModules();
      vi.unstubAllEnvs();
      vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "WHITE_LABEL");
    });

    it("ignora planId pro — sem Stripe, resposta só com redirect interno e requiresManualActivation", async () => {
      mockTenantCreate.mockResolvedValue({
        id: "t-wl",
        name: "WL User",
        plan: "free",
      });
      mockUserCreate.mockResolvedValue({
        id: "u-wl",
        email: "wl@example.com",
        name: "WL User",
        role: "manager",
        tenantId: "t-wl",
      });

      const { POST } = await import("../route");
      const req = new NextRequest("http://localhost/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          name: "WL User",
          email: "wl@example.com",
          password: "12345678",
          planId: "pro",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;

      expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
      expect(body.redirectTo).toBe("/onboarding");
      expect(body.requiresManualActivation).toBe(true);
      expect(typeof body.message).toBe("string");
      expect(body).not.toHaveProperty("redirectUrl");
      expect(body).not.toHaveProperty("plan");
      expect(body).not.toHaveProperty("planId");

      expect(mockTenantCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ plan: "free" }),
        })
      );
      expect(mockEnsureTenantSubscription).toHaveBeenCalledWith("t-wl", expect.any(String));
    });

    it("fluxo free permanece sem campos de billing na resposta", async () => {
      const { POST } = await import("../route");
      const req = new NextRequest("http://localhost/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          name: "Free WL",
          email: "freewl@example.com",
          password: "12345678",
          planId: "free",
        }),
        headers: { "Content-Type": "application/json" },
      });
      mockUserCreate.mockResolvedValue({
        id: "u-fw",
        email: "freewl@example.com",
        name: "Free WL",
        role: "manager",
        tenantId: "t-new",
      });
      const res = await POST(req);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.success).toBe(true);
      expect(body.requiresManualActivation).toBe(true);
      expect(body).not.toHaveProperty("redirectUrl");
    });
  });
});
