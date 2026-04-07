/**
 * Logs de webhook em Supabase (`webhook_logs`).
 * @deprecated Fora do hot path do produto; opcional para auditoria manual.
 */

import { getSupabaseServiceClient } from "@/lib/supabase-server";
import type { WebhookLog } from "@/lib/db/types";

export async function insertWebhookLog(payload: unknown, tenantId: string | null): Promise<WebhookLog> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("webhook_logs")
    .insert({ tenant_id: tenantId, payload, processed_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw new Error(`webhook_logs.insert: ${error.message}`);
  return data as WebhookLog;
}

/** @deprecated Alias de `insertWebhookLog` (Supabase). */
export async function persistWebhookLog(
  payload: unknown,
  tenantId: string | null
): Promise<WebhookLog> {
  return insertWebhookLog(payload, tenantId);
}
