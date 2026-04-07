import { formatResendFromAddress } from "../utils/formatFromAddress";

export type ResolvedTransactionalEmailConfig =
  | { ok: true; apiKey: string; from: string; replyTo?: string }
  | { ok: false; reason: "missing_api_key" | "missing_from" };

/**
 * RESEND_API_KEY obrigatório para envio.
 * Remetente: EMAIL_FROM ou legado RESEND_FROM.
 * Resposta opcional: EMAIL_REPLY_TO.
 */
export function getTransactionalEmailConfig(): ResolvedTransactionalEmailConfig {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, reason: "missing_api_key" };
  }
  const rawFrom = (process.env.EMAIL_FROM ?? process.env.RESEND_FROM)?.trim();
  if (!rawFrom) {
    return { ok: false, reason: "missing_from" };
  }
  const from = formatResendFromAddress(rawFrom);
  const replyTo = process.env.EMAIL_REPLY_TO?.trim() || undefined;
  return { ok: true, apiKey, from, replyTo };
}
