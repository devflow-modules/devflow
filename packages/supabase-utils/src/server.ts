import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import type { CookieStore, CookieOption } from "./cookies";

export type { CookieStore, CookieOption } from "./cookies";

/**
 * Create a Supabase server client with the given cookie store.
 * Use from your framework's server context (e.g. Next.js route handler: await cookies() then pass adapter).
 */
export function createServerClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  cookieStore: CookieStore
) {
  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieOption[]) {
        cookieStore.setAll(cookiesToSet);
      },
    },
  });
}
