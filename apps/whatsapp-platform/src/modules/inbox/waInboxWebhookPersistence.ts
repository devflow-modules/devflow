import { parseWaInboxWebhookPayload } from "./waInboxWebhookParser";
import {
  waInboxApplyStatus,
  waInboxCreateInbound,
  waInboxTenantExists,
} from "./waInboxMessageService";

/**
 * Persiste inbox a partir do POST webhook (inbound primeiro, depois status).
 * @param businessPhoneNumberId — Meta phone_number_id da linha que recebeu o evento.
 */
export async function persistWaInboxFromWebhook(
  tenantId: string,
  businessPhoneNumberId: string,
  body: unknown
): Promise<void> {
  if (!(await waInboxTenantExists(tenantId))) return;

  const { inbound, statuses } = parseWaInboxWebhookPayload(body);

  for (const m of inbound) {
    try {
      await waInboxCreateInbound(tenantId, businessPhoneNumberId, m);
    } catch (e) {
      console.error("[wa-inbox] inbound", e);
    }
  }

  for (const s of statuses) {
    try {
      await waInboxApplyStatus(tenantId, s);
    } catch (e) {
      console.error("[wa-inbox] status", e);
    }
  }
}
