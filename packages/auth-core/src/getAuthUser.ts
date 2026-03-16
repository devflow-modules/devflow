import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Generic helper: get current auth user from a Supabase client.
 * Each product uses this with its own Supabase instance and then syncs to its DB (e.g. Prisma User).
 */
export async function getAuthUser(supabase: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { user, error };
}
