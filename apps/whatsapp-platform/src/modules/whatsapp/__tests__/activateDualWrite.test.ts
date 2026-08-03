import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  TOKEN_ENCRYPTION_KEY_BYTES,
  encryptSecret,
  tamperEncryptedCiphertextForTest,
  type TokenKeyring,
} from "@/lib/secrets/tokenEncryption";
import { loadTokenEncryptionKeyringFromEnv } from "@/lib/secrets/tokenEncryptionKeyring";
import {
  buildEncryptedAccessTokenFields,
  resolveLineAccessToken,
} from "../lineAccessToken";

const TEST_KEY_B64 = Buffer.alloc(TOKEN_ENCRYPTION_KEY_BYTES, 11).toString("base64");

function testRing(): TokenKeyring {
  return {
    current: {
      keyId: "lifecycle-k1",
      key: Buffer.from(TEST_KEY_B64, "base64"),
    },
  };
}

const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    whatsappPhoneNumber: {
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/modules/whatsapp/channelEventService", () => ({
  logChannelEvent: vi.fn(),
}));

vi.mock("@/modules/whatsapp/whatsappPhonePolicy", () => ({
  ensureTenantHasPrimaryAndDefaultOutbound: vi.fn(),
}));

vi.mock("@/modules/whatsapp/validateWhatsappCloudCredentials", () => ({
  validateWhatsappCloudCredentials: vi.fn(async () => ({ ok: true, displayPhoneNumber: "+5511" })),
}));

describe("activateWhatsappChannel encrypt-only", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY = TEST_KEY_B64;
    process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY_ID = "lifecycle-k1";
    mockFindUnique.mockResolvedValue({
      id: "chan-1",
      tenantId: "t1",
      phoneNumberId: "pn1",
      displayPhoneNumber: null,
      activatedAt: null,
      status: "PENDING_ACTIVATION",
      accessTokenEncrypted: null,
    });
    mockUpdate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "chan-1",
      tenantId: "t1",
      phoneNumberId: "pn1",
      status: data.status,
      activatedAt: data.activatedAt ?? new Date(),
      accessTokenEncrypted: data.accessTokenEncrypted,
    }));
  });

  afterEach(() => {
    delete process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY;
    delete process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY_ID;
  });

  it("grava somente accessTokenEncrypted", async () => {
    const { activateWhatsappChannel } = await import("../whatsappChannelLifecycle");
    await activateWhatsappChannel({
      channelId: "chan-1",
      accessToken: "12345678901",
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          accessTokenEncrypted: expect.stringMatching(/^dfwa1\./),
          status: "ACTIVE",
        }),
      })
    );
    const updateData = mockUpdate.mock.calls[0][0].data as {
      accessTokenEncrypted: string;
      accessToken?: unknown;
    };
    expect(updateData).not.toHaveProperty("accessToken");
    const resolved = resolveLineAccessToken(
      { accessTokenEncrypted: updateData.accessTokenEncrypted },
      testRing()
    );
    expect(resolved.ok && resolved.token).toBe("12345678901");
  });

  it("sem chave não persiste", async () => {
    delete process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY;
    delete process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY_ID;
    vi.resetModules();
    const { activateWhatsappChannel } = await import("../whatsappChannelLifecycle");
    await expect(
      activateWhatsappChannel({ channelId: "chan-1", accessToken: "12345678901" })
    ).rejects.toThrow();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("loadTokenEncryptionKeyringFromEnv", () => {
  it("retorna null quando ausente", () => {
    expect(loadTokenEncryptionKeyringFromEnv({})).toBeNull();
  });

  it("carrega chave base64 de 32 bytes", () => {
    const ring = loadTokenEncryptionKeyringFromEnv({
      WHATSAPP_TOKEN_ENCRYPTION_KEY: TEST_KEY_B64,
      WHATSAPP_TOKEN_ENCRYPTION_KEY_ID: "k1",
    });
    expect(ring?.current.keyId).toBe("k1");
    expect(ring?.current.key.length).toBe(32);
    const fields = buildEncryptedAccessTokenFields("x", ring);
    expect(fields.accessTokenEncrypted.startsWith("dfwa1.")).toBe(true);
  });

  it("rejeita tamanho inválido", () => {
    expect(() =>
      loadTokenEncryptionKeyringFromEnv({
        WHATSAPP_TOKEN_ENCRYPTION_KEY: Buffer.alloc(8).toString("base64"),
        WHATSAPP_TOKEN_ENCRYPTION_KEY_ID: "k1",
      })
    ).toThrow();
  });
});

describe("fail-closed decrypt for resolved tenant", () => {
  it("whatsappRowToResolvedTenant null quando encrypted falha", async () => {
    process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY = TEST_KEY_B64;
    process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY_ID = "lifecycle-k1";
    const keyring = testRing();
    const bad = tamperEncryptedCiphertextForTest(encryptSecret("good-token", keyring));
    const { whatsappRowToResolvedTenant } = await import("../whatsappPhoneResolution");
    const tenant = whatsappRowToResolvedTenant("t1", {
      id: "w1",
      tenantId: "t1",
      phoneNumberId: "pn",
      displayPhoneNumber: "+1",
      accessTokenEncrypted: bad,
      status: "ACTIVE",
    } as never);
    expect(tenant.accessToken).toBeNull();
  });
});
