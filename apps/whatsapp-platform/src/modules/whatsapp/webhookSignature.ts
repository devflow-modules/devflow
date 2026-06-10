/**
 * Validação HMAC SHA-256 do webhook Meta (`X-Hub-Signature-256`).
 * A assinatura é calculada sobre o corpo bruto do POST, não sobre JSON re-parseado.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const META_WEBHOOK_SIGNATURE_HEADER = "x-hub-signature-256";

export type WebhookSignatureFailureCode =
  | "WEBHOOK_APP_SECRET_MISSING"
  | "WEBHOOK_SIGNATURE_MISSING"
  | "WEBHOOK_SIGNATURE_INVALID";

export type WebhookSignatureValidationResult =
  | { ok: true; bypass?: false }
  | { ok: true; bypass: true }
  | { ok: false; code: WebhookSignatureFailureCode; status: 401 | 403 };

export function getMetaAppSecretForWebhook(): string | undefined {
  const secret = process.env.META_APP_SECRET ?? process.env.FACEBOOK_APP_SECRET;
  return secret?.trim() || undefined;
}

/** Dev/test only — nunca activo em `NODE_ENV=production`. */
export function isWebhookSignatureBypassEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.WHATSAPP_SKIP_WEBHOOK_SIGNATURE === "1";
}

export function computeMetaWebhookSignature(rawBody: string | Buffer, appSecret: string): string {
  const digest = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  return `sha256=${digest}`;
}

export function verifyMetaWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string,
  appSecret: string
): boolean {
  if (!signatureHeader.startsWith("sha256=")) return false;
  const expected = computeMetaWebhookSignature(rawBody, appSecret);
  const expectedBuf = Buffer.from(expected, "utf8");
  const receivedBuf = Buffer.from(signatureHeader, "utf8");
  if (expectedBuf.length !== receivedBuf.length) return false;
  return timingSafeEqual(expectedBuf, receivedBuf);
}

export function validateWebhookSignatureForRequest(
  rawBody: string,
  signatureHeader: string | null
): WebhookSignatureValidationResult {
  if (isWebhookSignatureBypassEnabled()) {
    return { ok: true, bypass: true };
  }

  const appSecret = getMetaAppSecretForWebhook();
  if (!appSecret) {
    return { ok: false, code: "WEBHOOK_APP_SECRET_MISSING", status: 403 };
  }

  const header = signatureHeader?.trim();
  if (!header) {
    return { ok: false, code: "WEBHOOK_SIGNATURE_MISSING", status: 401 };
  }

  if (!verifyMetaWebhookSignature(rawBody, header, appSecret)) {
    return { ok: false, code: "WEBHOOK_SIGNATURE_INVALID", status: 401 };
  }

  return { ok: true };
}

export function webhookSignatureFailureMessage(code: WebhookSignatureFailureCode): string {
  switch (code) {
    case "WEBHOOK_APP_SECRET_MISSING":
      return "Webhook app secret not configured.";
    case "WEBHOOK_SIGNATURE_MISSING":
      return "Missing webhook signature.";
    case "WEBHOOK_SIGNATURE_INVALID":
      return "Invalid webhook signature.";
  }
}
