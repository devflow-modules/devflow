import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";

/**
 * Create a Supabase browser client.
 */
export function createBrowserClient(supabaseUrl: string, supabaseAnonKey: string) {
  return createSupabaseBrowserClient(
    supabaseUrl || "https://placeholder.supabase.co",
    supabaseAnonKey || "placeholder"
  );
}
