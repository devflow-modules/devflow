import { logWhatsappPilotEvent, WHATSAPP_PILOT_EVENTS } from "@/lib/observability";
import { parseWaInboxWebhookPayload } from "./waInboxWebhookParser";
import {
  waInboxApplyStatus,
  waInboxCreateInbound,
  waInboxTenantExists,
} from "./waInboxMessageService";

export type WaInboxWebhookPersistOptions = {
  traceId?: string;
};

/**
 * Persiste inbox a partir do POST webhook (inbound primeiro, depois status).
 * @param businessPhoneNumberId — Meta phone_number_id da linha que recebeu o evento.
 */
export async function persistWaInboxFromWebhook(
  tenantId: string,
  businessPhoneNumberId: string,
  body: unknown,
  options?: WaInboxWebhookPersistOptions
): Promise<void> {
  if (!(await waInboxTenantExists(tenantId))) return;

  const { inbound, statuses } = parseWaInboxWebhookPayload(body);
  const correlationId = options?.traceId;

  for (const m of inbound) {
    try {
      const result = await waInboxCreateInbound(tenantId, businessPhoneNumberId, m, {
        traceId: correlationId,
      });
      if (result) {
        logWhatsappPilotEvent("info", "inbox", WHATSAPP_PILOT_EVENTS.INBOUND_MESSAGE_PERSISTED, {
          tenantId,
          threadId: result.threadId,
          messageId: result.messageId,
          metaMessageId: m.waMessageId,
          phoneNumberId: businessPhoneNumberId,
          correlationId,
          origin: "inbound",
        });
        logWhatsappPilotEvent(
          "info",
          "inbox",
          result.wasNewConversation
            ? WHATSAPP_PILOT_EVENTS.INBOUND_THREAD_CREATED
            : WHATSAPP_PILOT_EVENTS.INBOUND_THREAD_UPDATED,
          {
            tenantId,
            threadId: result.threadId,
            metaMessageId: m.waMessageId,
            phoneNumberId: businessPhoneNumberId,
            correlationId,
            origin: "inbound",
          }
        );
      }
    } catch (e) {
      logWhatsappPilotEvent("error", "inbox", "inbound_message_persist_failed", {
        tenantId,
        metaMessageId: m.waMessageId,
        phoneNumberId: businessPhoneNumberId,
        correlationId,
        origin: "inbound",
        reason: e instanceof Error ? e.message : String(e),
      });
    }
  }

  for (const s of statuses) {
    try {
      await waInboxApplyStatus(tenantId, s);
    } catch (e) {
      logWhatsappPilotEvent("error", "inbox", "inbound_status_apply_failed", {
        tenantId,
        metaMessageId: s.waMessageId,
        correlationId,
        origin: "inbound",
        reason: e instanceof Error ? e.message : String(e),
      });
    }
  }
}
