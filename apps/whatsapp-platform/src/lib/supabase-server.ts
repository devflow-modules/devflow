/**
 * Cliente Supabase do projeto WhatsApp (dedicado).
 * Usa service role para acesso server-side.
 * Envs: WHATSAPP_SUPABASE_URL, WHATSAPP_SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.WHATSAPP_SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.WHATSAPP_SUPABASE_SERVICE_ROLE_KEY ?? "";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let serviceClient: any = null;

export function getSupabaseServiceClient() {
  if (!serviceClient) {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("WHATSAPP_SUPABASE_URL and WHATSAPP_SUPABASE_SERVICE_ROLE_KEY are required for server operations.");
    }
    serviceClient = createClient(supabaseUrl, supabaseServiceKey);
  }
  return serviceClient;
}

export function hasSupabaseConfig(): boolean {
  return Boolean(supabaseUrl && supabaseServiceKey);
}
