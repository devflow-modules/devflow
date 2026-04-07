import { Resend } from "resend";

export type SendWithResendInput = {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

export type SendWithResendResult =
  | { ok: true; messageId: string }
  | { ok: false; errorCode: string; errorMessage: string };

/**
 * Única função de envio via SDK Resend (infra). Não persistir nem logar aqui.
 */
export async function sendWithResend(input: SendWithResendInput): Promise<SendWithResendResult> {
  const { apiKey, from, to, subject, html, replyTo } = input;
  if (!apiKey) {
    return {
      ok: false,
      errorCode: "MISSING_API_KEY",
      errorMessage: "RESEND_API_KEY é obrigatório para enviar e-mail.",
    };
  }
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    ...(replyTo ? { replyTo } : {}),
  });

  if (error) {
    return {
      ok: false,
      errorCode: error.name ?? "RESEND_ERROR",
      errorMessage: error.message ?? "Falha desconhecida do Resend",
    };
  }

  const messageId = data?.id ?? "";
  if (!messageId) {
    return {
      ok: false,
      errorCode: "RESEND_NO_ID",
      errorMessage: "Resend não devolveu id da mensagem",
    };
  }

  return { ok: true, messageId };
}
