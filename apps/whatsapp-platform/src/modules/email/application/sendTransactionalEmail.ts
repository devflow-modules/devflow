import type { Prisma } from "@/generated/prisma-whatsapp";
import type { z } from "zod";
import { getTransactionalEmailSubject } from "../domain/emailSubjects";
import {
  accountCreatedPayloadSchema,
  isTransactionalEmailType,
  passwordChangedPayloadSchema,
  resetPasswordPayloadSchema,
  welcomePayloadSchema,
  type TransactionalEmailType,
} from "../domain/emailTypes";
import { getTransactionalEmailConfig } from "../infrastructure/emailConfig";
import { createFailedEmailMessage, createSentEmailMessage } from "../infrastructure/emailRepository";
import { logTransactionalEmailOutcome } from "../infrastructure/emailLogger";
import { sendWithResend } from "../infrastructure/resendClient";
import { renderTransactionalEmailHtml } from "../utils/renderEmailTemplate";
import { sanitizeEmailPayloadForMetadata } from "../utils/sanitizeEmailLogData";

export type SendTransactionalEmailInput = {
  type: TransactionalEmailType | string;
  to: string;
  tenantId?: string | null;
  userId?: string | null;
  payload: unknown;
};

export type SendTransactionalEmailResult = {
  ok: boolean;
  provider: "resend";
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
};

function parsePayload(
  type: TransactionalEmailType,
  payload: unknown
):
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: z.ZodError } {
  const schema =
    type === "RESET_PASSWORD"
      ? resetPasswordPayloadSchema
      : type === "PASSWORD_CHANGED"
        ? passwordChangedPayloadSchema
        : type === "ACCOUNT_CREATED"
          ? accountCreatedPayloadSchema
          : welcomePayloadSchema;
  const r = schema.safeParse(payload);
  if (!r.success) return { ok: false, error: r.error };
  return { ok: true, data: r.data as Record<string, unknown> };
}

/**
 * Único ponto de entrada para e-mail transacional (templates + Resend + persistência + log).
 */
export async function sendTransactionalEmail(
  input: SendTransactionalEmailInput
): Promise<SendTransactionalEmailResult> {
  const started = performance.now();
  const { to, tenantId, userId, payload } = input;
  const typeRaw = input.type;

  if (!isTransactionalEmailType(typeRaw)) {
    const durationMs = Math.round(performance.now() - started);
    logTransactionalEmailOutcome({
      type: String(typeRaw),
      tenantId,
      userId,
      toEmail: to,
      status: "VALIDATION_FAILED",
      durationMs,
      provider: "resend",
      errorCode: "INVALID_EMAIL_TYPE",
      metadataHint: {},
    });
    return {
      ok: false,
      provider: "resend",
      errorCode: "INVALID_EMAIL_TYPE",
      errorMessage: "Tipo de e-mail transacional inválido",
    };
  }

  const type = typeRaw;
  const subject = getTransactionalEmailSubject(type);

  const config = getTransactionalEmailConfig();
  if (!config.ok) {
    const durationMs = Math.round(performance.now() - started);
    logTransactionalEmailOutcome({
      type,
      tenantId,
      userId,
      toEmail: to,
      status: "SKIPPED_CONFIG",
      durationMs,
      provider: "resend",
      errorCode: "EMAIL_NOT_CONFIGURED",
      metadataHint: sanitizeEmailPayloadForMetadata(
        typeof payload === "object" && payload !== null
          ? (payload as Record<string, unknown>)
          : {}
      ),
    });
    return {
      ok: false,
      provider: "resend",
      errorCode: "EMAIL_NOT_CONFIGURED",
      errorMessage:
        config.reason === "missing_api_key"
          ? "RESEND_API_KEY não configurada"
          : "EMAIL_FROM, RESEND_FROM ou RESEND_FROM_EMAIL não configurado",
    };
  }

  const parsed = parsePayload(type, payload);
  if (!parsed.ok) {
    const durationMs = Math.round(performance.now() - started);
    logTransactionalEmailOutcome({
      type,
      tenantId,
      userId,
      toEmail: to,
      status: "VALIDATION_FAILED",
      durationMs,
      provider: "resend",
      errorCode: "INVALID_PAYLOAD",
      metadataHint: {},
    });
    await createFailedEmailMessage({
      tenantId,
      userId,
      type,
      toEmail: to,
      subject,
      provider: "resend",
      errorCode: "INVALID_PAYLOAD",
      errorMessage: parsed.error.message,
    }).catch(() => undefined);
    return {
      ok: false,
      provider: "resend",
      errorCode: "INVALID_PAYLOAD",
      errorMessage: "Payload inválido para o tipo de e-mail",
    };
  }

  const safeMeta = sanitizeEmailPayloadForMetadata(parsed.data);
  let html: string;
  try {
    html = await renderTransactionalEmailHtml(type, parsed.data as never);
  } catch (e) {
    const durationMs = Math.round(performance.now() - started);
    const msg = e instanceof Error ? e.message : "render_failed";
    logTransactionalEmailOutcome({
      type,
      tenantId,
      userId,
      toEmail: to,
      status: "FAILED",
      durationMs,
      provider: "resend",
      errorCode: "RENDER_FAILED",
      metadataHint: safeMeta,
    });
    await createFailedEmailMessage({
      tenantId,
      userId,
      type,
      toEmail: to,
      subject,
      provider: "resend",
      errorCode: "RENDER_FAILED",
      errorMessage: msg,
      metadata: safeMeta as Prisma.InputJsonValue,
    }).catch(() => undefined);
    return {
      ok: false,
      provider: "resend",
      errorCode: "RENDER_FAILED",
      errorMessage: msg,
    };
  }

  const sendResult = await sendWithResend({
    apiKey: config.apiKey,
    from: config.from,
    to,
    subject,
    html,
    replyTo: config.replyTo,
  });

  const durationMs = Math.round(performance.now() - started);

  if (!sendResult.ok) {
    logTransactionalEmailOutcome({
      type,
      tenantId,
      userId,
      toEmail: to,
      status: "FAILED",
      durationMs,
      provider: "resend",
      errorCode: sendResult.errorCode,
      metadataHint: safeMeta,
    });
    await createFailedEmailMessage({
      tenantId,
      userId,
      type,
      toEmail: to,
      subject,
      provider: "resend",
      errorCode: sendResult.errorCode,
      errorMessage: sendResult.errorMessage,
      metadata: safeMeta as Prisma.InputJsonValue,
    }).catch(() => undefined);
    return {
      ok: false,
      provider: "resend",
      errorCode: "EMAIL_SEND_FAILED",
      errorMessage: "Falha ao enviar e-mail",
    };
  }

  logTransactionalEmailOutcome({
    type,
    tenantId,
    userId,
    toEmail: to,
    status: "SENT",
    durationMs,
    provider: "resend",
    providerMessageId: sendResult.messageId,
    metadataHint: safeMeta,
  });

  await createSentEmailMessage({
    tenantId,
    userId,
    type,
    toEmail: to,
    subject,
    provider: "resend",
    providerMessageId: sendResult.messageId,
    metadata: safeMeta as Prisma.InputJsonValue,
  }).catch(() => undefined);

  return {
    ok: true,
    provider: "resend",
    providerMessageId: sendResult.messageId,
  };
}
