/**
 * Cliente Supabase para uso em API routes (webhook, etc.) onde não há cookies.
 * Usa service role para acesso server-side.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let serviceClient: any = null;

export function getSupabaseServiceClient() {
  if (!serviceClient) {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for server operations.");
    }
    serviceClient = createClient(supabaseUrl, supabaseServiceKey);
  }
  return serviceClient;
}

export function hasSupabaseConfig(): boolean {
  return Boolean(supabaseUrl && supabaseServiceKey);
}
