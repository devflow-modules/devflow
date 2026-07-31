import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockGetAuthFromRequest = vi.fn();
const mockPrisma = {
  tenant: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  whatsappPhoneNumber: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
};

const mockResolvePrimaryPhoneNumber = vi.fn();
const mockValidateCreds = vi.fn();
const mockEnsureOutbound = vi.fn();

vi.mock("@/modules/auth", () => ({ getAuthFromRequest: (...args: unknown[]) => mockGetAuthFromRequest(...args) }));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/whatsapp/whatsappPhoneResolution", () => ({
  resolvePrimaryPhoneNumber: (...args: unknown[]) => mockResolvePrimaryPhoneNumber(...args),
}));
vi.mock("@/modules/whatsapp/validateWhatsappCloudCredentials", () => ({
  validateWhatsappCloudCredentials: (...args: unknown[]) => mockValidateCreds(...args),
}));
vi.mock("@/modules/whatsapp/whatsappPhonePolicy", () => ({
  ensureTenantHasPrimaryAndDefaultOutbound: (...args: unknown[]) => mockEnsureOutbound(...args),
}));

const tenantRow = {
  id: "t1",
  name: "Tenant",
  gtmLifecycle: "AVALIACAO",
  aiDriver: "openAI",
  defaultPrompt: null,
  systemPrompt: null,
  apiKey: "key",
  plan: null,
  activeUntil: null,
  whatsappPhone: null,
};

describe("GET /api/tenants/me", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "SAAS");
    mockResolvePrimaryPhoneNumber.mockResolvedValue({
      phoneNumberId: "pn1",
      displayPhoneNumber: "+351 910 000 000",
    });
    mockPrisma.tenant.findUnique.mockResolvedValue(tenantRow);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("retorna 401 quando não autenticado", async () => {
    mockGetAuthFromRequest.mockResolvedValue(null);
    const { GET } = await import("../route");
    const res = await GET(new Request("http://localhost/api/tenants/me") as never);
    expect(res.status).toBe(401);
  });

  it("operador recebe payload mínimo", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t1", sub: "u1", email: "a@b.com", name: "User", role: "operator" },
    });
    const { GET } = await import("../route");
    const res = await GET(new Request("http://localhost/api/tenants/me") as never);
    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data).toEqual({
      id: "t1",
      name: "Tenant",
      plan: null,
      gtmLifecycle: "AVALIACAO",
      hasWhatsappPhone: true,
    });
    expect(data).not.toHaveProperty("defaultPrompt");
    expect(data).not.toHaveProperty("hasApiKey");
    expect(data).not.toHaveProperty("apiKey");
  });

  it("gestor recebe payload completo", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t1", sub: "u1", email: "a@b.com", name: "User", role: "manager" },
    });
    const { GET } = await import("../route");
    const res = await GET(new Request("http://localhost/api/tenants/me") as never);
    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.id).toBe("t1");
    expect(data.gtmLifecycle).toBe("AVALIACAO");
    expect(data.hasApiKey).toBe(true);
    expect(data.aiDriver).toBe("openAI");
    expect(data.primaryPhoneNumberId).toBe("pn1");
  });

  it("WHITE_LABEL + manager não inclui plan nem activeUntil", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "WHITE_LABEL");
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t1", sub: "u1", email: "a@b.com", name: "User", role: "manager" },
    });
    mockPrisma.tenant.findUnique.mockResolvedValue({
      ...tenantRow,
      plan: "PRO",
      activeUntil: new Date("2030-01-01"),
    });
    const { GET } = await import("../route");
    const res = await GET(new Request("http://localhost/api/tenants/me") as never);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data).not.toHaveProperty("plan");
    expect(data).not.toHaveProperty("activeUntil");
    expect(data.id).toBe("t1");
  });

  it("WHITE_LABEL + platform_admin mantém plan", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "WHITE_LABEL");
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t1", sub: "u1", email: "a@b.com", name: "User", role: "platform_admin" },
    });
    mockPrisma.tenant.findUnique.mockResolvedValue({
      ...tenantRow,
      plan: "PRO",
      activeUntil: new Date("2030-01-01"),
    });
    const { GET } = await import("../route");
    const res = await GET(new Request("http://localhost/api/tenants/me") as never);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.plan).toBe("PRO");
    expect(typeof data.activeUntil).toBe("string");
  });
});

describe("PATCH /api/tenants/me (aiDriver)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t1", sub: "u1", email: "a@b.com", name: "User", role: "manager" },
    });
    mockPrisma.tenant.findUnique.mockResolvedValue(tenantRow);
    mockPrisma.tenant.update.mockResolvedValue(tenantRow);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("retorna 401 quando não autenticado", async () => {
    mockGetAuthFromRequest.mockResolvedValue(null);
    const { PATCH } = await import("../route");
    const req = new Request("http://localhost/api/tenants/me", {
      method: "PATCH",
      body: JSON.stringify({ aiDriver: "openAI" }),
    });
    const res = await PATCH(req as never);
    expect(res.status).toBe(401);
  });

  it("retorna 403 quando operador tenta PATCH", async () => {
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t1", sub: "u1", email: "a@b.com", name: "User", role: "operator" },
    });
    const { PATCH } = await import("../route");
    const req = new Request("http://localhost/api/tenants/me", {
      method: "PATCH",
      body: JSON.stringify({ aiDriver: "openAI" }),
    });
    const res = await PATCH(req as never);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.code).toBe("FORBIDDEN_ROLE");
  });

  it("atualiza aiDriver e retorna 200", async () => {
    const { PATCH } = await import("../route");
    const req = new Request("http://localhost/api/tenants/me", {
      method: "PATCH",
      body: JSON.stringify({ aiDriver: "openAI" }),
    });
    const res = await PATCH(req as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.aiDriver).toBe("openAI");
    expect(mockPrisma.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "t1" },
        data: expect.objectContaining({ aiDriver: "openAI" }),
      })
    );
  });
});

const TEST_KEY_B64 = Buffer.alloc(32, 13).toString("base64");

describe("PATCH /api/tenants/me (SEC-1a dual-write WhatsApp)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY = TEST_KEY_B64;
    process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY_ID = "tenants-me-k1";
    process.env.WHATSAPP_SKIP_CLOUD_CREDENTIAL_VALIDATE = "1";
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t1", sub: "u1", email: "a@b.com", name: "User", role: "manager" },
    });
    mockPrisma.tenant.findUnique.mockResolvedValue(tenantRow);
    mockPrisma.whatsappPhoneNumber.findUnique.mockResolvedValue(null);
    mockPrisma.whatsappPhoneNumber.upsert.mockResolvedValue({ id: "w1" });
    mockValidateCreds.mockResolvedValue({ ok: true, displayPhoneNumber: "+5511999999999" });
    mockEnsureOutbound.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY;
    delete process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY_ID;
    delete process.env.WHATSAPP_SKIP_CLOUD_CREDENTIAL_VALIDATE;
    vi.unstubAllEnvs();
  });

  it("grava accessToken + accessTokenEncrypted no upsert Prisma", async () => {
    const { PATCH } = await import("../route");
    const { resolveLineAccessToken } = await import("@/modules/whatsapp/lineAccessToken");
    const { loadTokenEncryptionKeyringFromEnv } = await import(
      "@/lib/secrets/tokenEncryptionKeyring"
    );

    const req = new Request("http://localhost/api/tenants/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNumberId: "pn-sec1a",
        accessToken: "1234567890abcdef",
        displayPhoneNumber: "+5511999999999",
      }),
    });
    const res = await PATCH(req as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).not.toHaveProperty("accessToken");
    expect(body).not.toHaveProperty("accessTokenEncrypted");

    expect(mockPrisma.whatsappPhoneNumber.upsert).toHaveBeenCalledTimes(1);
    const upsertArg = mockPrisma.whatsappPhoneNumber.upsert.mock.calls[0][0] as {
      create: { accessToken: string; accessTokenEncrypted: string };
      update: { accessToken: string; accessTokenEncrypted: string };
    };
    expect(upsertArg.create.accessToken).toBe("1234567890abcdef");
    expect(upsertArg.create.accessTokenEncrypted).toMatch(/^dfwa1\./);
    expect(upsertArg.update.accessToken).toBe("1234567890abcdef");
    expect(upsertArg.update.accessTokenEncrypted).toMatch(/^dfwa1\./);

    const ring = loadTokenEncryptionKeyringFromEnv();
    const roundTrip = resolveLineAccessToken(
      {
        accessToken: upsertArg.create.accessToken,
        accessTokenEncrypted: upsertArg.create.accessTokenEncrypted,
      },
      ring
    );
    expect(roundTrip.ok && roundTrip.token).toBe("1234567890abcdef");
  });

  it("sem chave de criptografia não chama upsert (sem plaintext isolado)", async () => {
    delete process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY;
    delete process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY_ID;
    const { PATCH } = await import("../route");
    const req = new Request("http://localhost/api/tenants/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNumberId: "pn-sec1a",
        accessToken: "1234567890abcdef",
      }),
    });
    const res = await PATCH(req as never);
    expect(res.status).toBe(503);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe("ENCRYPTION_KEY_MISSING");
    expect(JSON.stringify(body)).not.toContain("1234567890abcdef");
    expect(mockPrisma.whatsappPhoneNumber.upsert).not.toHaveBeenCalled();
  });
});
