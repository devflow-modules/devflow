import { logEvent, type LogCorrelation, type LogLevel, type LogSource } from "./log-event";
import type { WhatsappPilotEventName, WhatsappPilotOrigin } from "./pilot-events";

export type WhatsappPilotLogFields = {
  tenantId?: string;
  threadId?: string;
  messageId?: string;
  metaMessageId?: string;
  phoneNumberId?: string;
  wabaId?: string;
  correlationId?: string;
  reason?: string;
  status?: string | number;
  errorCode?: string;
  durationMs?: number;
  origin?: WhatsappPilotOrigin;
} & Record<string, unknown>;

/**
 * Log estruturado canónico do piloto WhatsApp Platform.
 * Propaga `trace_id` / `tenant_id` e sanitiza campos sensíveis via `logEvent`.
 */
export function logWhatsappPilotEvent(
  level: LogLevel,
  source: LogSource,
  event: WhatsappPilotEventName | string,
  fields?: WhatsappPilotLogFields
): void {
  const {
    tenantId,
    threadId,
    messageId,
    metaMessageId,
    phoneNumberId,
    wabaId,
    correlationId,
    reason,
    status,
    errorCode,
    durationMs,
    origin,
    ...rest
  } = fields ?? {};

  const correlation: LogCorrelation = {
    ...(correlationId ? { trace_id: correlationId } : {}),
    ...(tenantId ? { tenant_id: tenantId } : {}),
  };

  const data: Record<string, unknown> = {
    ...(origin ? { origin } : {}),
    ...(threadId ? { thread_id: threadId } : {}),
    ...(messageId ? { message_id: messageId } : {}),
    ...(metaMessageId ? { meta_message_id: metaMessageId } : {}),
    ...(phoneNumberId ? { phone_number_id: phoneNumberId } : {}),
    ...(wabaId ? { waba_id: wabaId } : {}),
    ...(reason ? { reason } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(errorCode ? { error_code: errorCode } : {}),
    ...(durationMs !== undefined ? { duration_ms: durationMs } : {}),
    ...rest,
  };

  logEvent(level, source, event, Object.keys(data).length > 0 ? data : undefined, correlation);
}

/** Extrai status HTTP de erros lançados pelo adapter Cloud API. */
export function parseCloudApiError(err: unknown): { status?: number; errorCode?: string; message: string } {
  const message = err instanceof Error ? err.message : String(err);
  const match = message.match(/WhatsApp API error (\d+)/i);
  const status = match ? Number(match[1]) : undefined;
  return {
    message,
    status,
    errorCode: status !== undefined ? `HTTP_${status}` : undefined,
  };
}
