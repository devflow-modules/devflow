/**
 * Cliente Supabase do WhatsApp Platform (opcional).
 * Usado para webhook_logs, conversations, messages quando configurado.
 * Envs: WHATSAPP_SUPABASE_URL, WHATSAPP_SUPABASE_SERVICE_ROLE_KEY
 *
 * Tipagem permissiva: tabelas (conversations, messages, etc.) são definidas
 * no Supabase do produto, não no schema gerado localmente.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.WHATSAPP_SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.WHATSAPP_SUPABASE_SERVICE_ROLE_KEY ?? "";

// Client sem Database genérico — permite operações em tabelas dinâmicas do Supabase WhatsApp
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let serviceClient: any = null;

export function getSupabaseServiceClient() {
  if (!serviceClient) {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        "WHATSAPP_SUPABASE_URL and WHATSAPP_SUPABASE_SERVICE_ROLE_KEY are required for server operations."
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    serviceClient = createClient(supabaseUrl, supabaseServiceKey) as any;
  }
  return serviceClient;
}

export function hasSupabaseConfig(): boolean {
  return Boolean(supabaseUrl && supabaseServiceKey);
}
