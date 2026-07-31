import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TOKEN_ENCRYPTION_KEY_BYTES } from "@/lib/secrets/tokenEncryption";

const TEST_KEY_B64 = Buffer.alloc(TOKEN_ENCRYPTION_KEY_BYTES, 17).toString("base64");

const mockGetAuthFromRequest = vi.fn();
const mockRequireRole = vi.fn((_auth: unknown, _roles: unknown, _req: unknown) => null);
const mockExchange = vi.fn();
const mockFindUnique = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockEnsure = vi.fn();
const mockLogChannelEvent = vi.fn();

vi.mock("@/modules/auth", () => ({
  getAuthFromRequest: (...a: unknown[]) => mockGetAuthFromRequest(...a),
  requireRole: (auth: unknown, roles: unknown, req: unknown) => mockRequireRole(auth, roles, req),
  ROLES_MANAGER_PLUS: ["manager", "platform_admin"],
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: { findUnique: vi.fn(async () => ({ id: "t1" })) },
    whatsappPhoneNumber: {
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      create: (...a: unknown[]) => mockCreate(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
    },
  },
}));

vi.mock("@/modules/whatsapp/embeddedSignupService", () => ({
  exchangeCodeAndFetchPhoneNumbers: (...a: unknown[]) => mockExchange(...a),
}));

vi.mock("@/modules/whatsapp/channelEventService", () => ({
  logChannelEvent: (...a: unknown[]) => mockLogChannelEvent(...a),
}));

vi.mock("@/modules/whatsapp/whatsappPhonePolicy", () => ({
  ensureTenantHasPrimaryAndDefaultOutbound: (...a: unknown[]) => mockEnsure(...a),
}));

describe("POST /api/whatsapp/onboard/callback SEC-1a dual-write", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY = TEST_KEY_B64;
    process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY_ID = "onboard-k1";
    mockGetAuthFromRequest.mockResolvedValue({
      payload: { tenantId: "t1", sub: "u1", role: "manager" },
    });
    mockRequireRole.mockReturnValue(null);
    mockExchange.mockResolvedValue([
      {
        phoneNumberId: "phone_1",
        displayPhoneNumber: "+5511999999999",
        wabaId: "waba_1",
        accessToken: "EAAG_ONBOARD_TOKEN_VALUE",
        businessId: "biz_1",
      },
    ]);
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: "row1", phoneNumberId: "phone_1" });
    mockEnsure.mockResolvedValue(undefined);
    mockLogChannelEvent.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY;
    delete process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY_ID;
  });

  it("create grava accessToken + accessTokenEncrypted e resposta sem secrets", async () => {
    const { POST } = await import("../route");
    const { resolveLineAccessToken } = await import("@/modules/whatsapp/lineAccessToken");
    const { loadTokenEncryptionKeyringFromEnv } = await import(
      "@/lib/secrets/tokenEncryptionKeyring"
    );

    const req = new Request("http://localhost/api/whatsapp/onboard/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "auth_code", state: "t1" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.success).toBe(true);
    expect(JSON.stringify(json)).not.toContain("EAAG_ONBOARD_TOKEN_VALUE");
    expect(JSON.stringify(json)).not.toMatch(/dfwa1\./);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const data = mockCreate.mock.calls[0][0].data as {
      accessToken: string;
      accessTokenEncrypted: string;
    };
    expect(data.accessToken).toBe("EAAG_ONBOARD_TOKEN_VALUE");
    expect(data.accessTokenEncrypted).toMatch(/^dfwa1\./);

    const ring = loadTokenEncryptionKeyringFromEnv();
    const rt = resolveLineAccessToken(
      { accessToken: data.accessToken, accessTokenEncrypted: data.accessTokenEncrypted },
      ring
    );
    expect(rt.ok && rt.token).toBe("EAAG_ONBOARD_TOKEN_VALUE");
  });

  it("update existente substitui ambos os campos", async () => {
    mockFindUnique.mockResolvedValue({
      id: "existing",
      tenantId: "t1",
      phoneNumberId: "phone_1",
      activatedAt: new Date("2026-01-01"),
    });
    mockUpdate.mockResolvedValue({ id: "existing" });

    const { POST } = await import("../route");
    const req = new Request("http://localhost/api/whatsapp/onboard/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "auth_code", state: "t1" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "existing" },
        data: expect.objectContaining({
          accessToken: "EAAG_ONBOARD_TOKEN_VALUE",
          accessTokenEncrypted: expect.stringMatching(/^dfwa1\./),
        }),
      })
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("sem chave não persiste (create/update não chamados)", async () => {
    delete process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY;
    delete process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY_ID;
    const { POST } = await import("../route");
    const req = new Request("http://localhost/api/whatsapp/onboard/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "auth_code", state: "t1" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(503);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.code).toBe("ENCRYPTION_KEY_MISSING");
    expect(JSON.stringify(json)).not.toContain("EAAG_ONBOARD_TOKEN_VALUE");
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
