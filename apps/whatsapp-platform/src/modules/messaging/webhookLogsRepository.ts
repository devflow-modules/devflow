/**
 * Repositório de logs de webhook — persistir payload recebido.
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
