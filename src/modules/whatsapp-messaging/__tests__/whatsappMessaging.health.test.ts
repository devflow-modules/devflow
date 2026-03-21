import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getMessagingHealth } from "../whatsappMessaging.health";
import { MessagingBlockedReason } from "../whatsappMessaging.types";

describe("getMessagingHealth", () => {
  const orig = global.fetch;

  beforeEach(() => {
    delete process.env.META_WABA_ID;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    process.env.META_SYSTEM_USER_TOKEN = "test-token";
    process.env.META_PHONE_NUMBER_ID = "12345678901234";
    process.env.META_API_VERSION = "v21.0";
    process.env.WHATSAPP_VERIFY_TOKEN = "verify-secret";
  });

  afterEach(() => {
    delete process.env.META_SYSTEM_USER_TOKEN;
    delete process.env.META_PHONE_NUMBER_ID;
    delete process.env.META_API_VERSION;
    delete process.env.WHATSAPP_VERIFY_TOKEN;
    global.fetch = orig;
  });

  it("TOKEN_MISSING quando sem token", async () => {
    delete process.env.META_SYSTEM_USER_TOKEN;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.META_WHATSAPP_ACCESS_TOKEN;
    const h = await getMessagingHealth();
    expect(h.blockedReason).toBe(MessagingBlockedReason.TOKEN_MISSING);
  });

  it("phoneNumberIdOk quando Graph retorna 200", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    }) as unknown as typeof fetch;
    const h = await getMessagingHealth();
    expect(h.phoneNumberIdOk).toBe(true);
    expect(h.tokenOk).toBe(true);
  });

  it("TOKEN_INVALID em 401", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 }) as unknown as typeof fetch;
    const h = await getMessagingHealth();
    expect(h.blockedReason).toBe(MessagingBlockedReason.TOKEN_INVALID);
  });
});
