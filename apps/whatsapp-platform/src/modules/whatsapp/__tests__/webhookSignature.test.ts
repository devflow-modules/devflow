import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  computeMetaWebhookSignature,
  validateWebhookSignatureForRequest,
  verifyMetaWebhookSignature,
} from "../webhookSignature";

describe("webhookSignature", () => {
  const secret = "test_meta_app_secret";
  const rawBody = JSON.stringify({ object: "whatsapp_business_account", entry: [] });

  beforeEach(() => {
    delete process.env.META_APP_SECRET;
    delete process.env.FACEBOOK_APP_SECRET;
    delete process.env.WHATSAPP_SKIP_WEBHOOK_SIGNATURE;
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    delete process.env.META_APP_SECRET;
    delete process.env.FACEBOOK_APP_SECRET;
    delete process.env.WHATSAPP_SKIP_WEBHOOK_SIGNATURE;
  });

  it("computeMetaWebhookSignature gera prefixo sha256=", () => {
    const sig = computeMetaWebhookSignature(rawBody, secret);
    expect(sig.startsWith("sha256=")).toBe(true);
    expect(sig.length).toBeGreaterThan("sha256=".length);
  });

  it("verifyMetaWebhookSignature aceita assinatura válida", () => {
    const sig = computeMetaWebhookSignature(rawBody, secret);
    expect(verifyMetaWebhookSignature(rawBody, sig, secret)).toBe(true);
  });

  it("verifyMetaWebhookSignature rejeita assinatura inválida", () => {
    expect(verifyMetaWebhookSignature(rawBody, "sha256=deadbeef", secret)).toBe(false);
  });

  it("validateWebhookSignatureForRequest aceita assinatura válida com META_APP_SECRET", () => {
    process.env.META_APP_SECRET = secret;
    const sig = computeMetaWebhookSignature(rawBody, secret);
    expect(validateWebhookSignatureForRequest(rawBody, sig)).toEqual({ ok: true });
  });

  it("validateWebhookSignatureForRequest rejeita assinatura ausente", () => {
    process.env.META_APP_SECRET = secret;
    const result = validateWebhookSignatureForRequest(rawBody, null);
    expect(result).toEqual({
      ok: false,
      code: "WEBHOOK_SIGNATURE_MISSING",
      status: 401,
    });
  });

  it("validateWebhookSignatureForRequest rejeita assinatura inválida", () => {
    process.env.META_APP_SECRET = secret;
    const result = validateWebhookSignatureForRequest(rawBody, "sha256=invalid");
    expect(result).toEqual({
      ok: false,
      code: "WEBHOOK_SIGNATURE_INVALID",
      status: 401,
    });
  });

  it("validateWebhookSignatureForRequest rejeita sem app secret (sem bypass)", () => {
    const sig = computeMetaWebhookSignature(rawBody, secret);
    const result = validateWebhookSignatureForRequest(rawBody, sig);
    expect(result).toEqual({
      ok: false,
      code: "WEBHOOK_APP_SECRET_MISSING",
      status: 403,
    });
  });

  it("validateWebhookSignatureForRequest permite bypass explícito em dev/test", () => {
    process.env.WHATSAPP_SKIP_WEBHOOK_SIGNATURE = "1";
    expect(validateWebhookSignatureForRequest(rawBody, null)).toEqual({ ok: true, bypass: true });
  });

  it("validateWebhookSignatureForRequest ignora bypass em produção", () => {
    process.env.NODE_ENV = "production";
    process.env.WHATSAPP_SKIP_WEBHOOK_SIGNATURE = "1";
    const result = validateWebhookSignatureForRequest(rawBody, null);
    expect(result).toEqual({
      ok: false,
      code: "WEBHOOK_APP_SECRET_MISSING",
      status: 403,
    });
  });

  it("aceita FACEBOOK_APP_SECRET como fallback", () => {
    process.env.FACEBOOK_APP_SECRET = secret;
    const sig = computeMetaWebhookSignature(rawBody, secret);
    expect(validateWebhookSignatureForRequest(rawBody, sig)).toEqual({ ok: true });
  });
});
