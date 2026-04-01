import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("whatsapp helpers", () => {
  const original = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it("getWhatsAppOrMailtoUrl usa mailto quando número ausente", async () => {
    delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
    process.env.NEXT_PUBLIC_CONTACT_EMAIL = "test@example.com";
    const { getWhatsAppOrMailtoUrl, isWhatsAppNumberConfigured } = await import("../whatsapp");
    expect(isWhatsAppNumberConfigured()).toBe(false);
    expect(getWhatsAppOrMailtoUrl("Oi")).toMatch(/^mailto:test@example\.com\?/);
  });

  it("getWhatsAppOrMailtoUrl usa wa.me quando número existe", async () => {
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = "5511999887766";
    const { getWhatsAppOrMailtoUrl, isWhatsAppNumberConfigured } = await import("../whatsapp");
    expect(isWhatsAppNumberConfigured()).toBe(true);
    expect(getWhatsAppOrMailtoUrl()).toMatch(/^https:\/\/wa\.me\/5511999887766\?text=/);
  });
});
