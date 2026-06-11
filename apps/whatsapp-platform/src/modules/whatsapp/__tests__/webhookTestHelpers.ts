import { computeMetaWebhookSignature } from "../webhookSignature";

/** TypeScript marca `process.env.NODE_ENV` como read-only; testes usam defineProperty. */
export function setProcessEnvNodeEnv(value: string | undefined): void {
  Object.defineProperty(process.env, "NODE_ENV", {
    value,
    configurable: true,
    writable: true,
    enumerable: true,
  });
}

/** Headers Meta para POST webhook em testes (corpo bruto = string exacta enviada). */
export function metaWebhookTestHeaders(
  rawBody: string,
  appSecret: string
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Hub-Signature-256": computeMetaWebhookSignature(rawBody, appSecret),
  };
}

export function enableWebhookSignatureBypassForTests(): void {
  process.env.WHATSAPP_SKIP_WEBHOOK_SIGNATURE = "1";
  setProcessEnvNodeEnv("test");
}

export function clearWebhookSignatureTestEnv(): void {
  delete process.env.META_APP_SECRET;
  delete process.env.FACEBOOK_APP_SECRET;
  delete process.env.WHATSAPP_SKIP_WEBHOOK_SIGNATURE;
}
