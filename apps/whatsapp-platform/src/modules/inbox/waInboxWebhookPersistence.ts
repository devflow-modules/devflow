import { parseWaInboxWebhookPayload } from "./waInboxWebhookParser";
import {
  waInboxApplyStatus,
  waInboxCreateInbound,
  waInboxTenantExists,
} from "./waInboxMessageService";

/**
 * Persiste inbox a partir do POST webhook (inbound primeiro, depois status).
 */
export async function persistWaInboxFromWebhook(
  tenantId: string,
  body: unknown
): Promise<void> {
  if (!(await waInboxTenantExists(tenantId))) return;

  const { inbound, statuses } = parseWaInboxWebhookPayload(body);

  for (const m of inbound) {
    try {
      await waInboxCreateInbound(tenantId, m);
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
