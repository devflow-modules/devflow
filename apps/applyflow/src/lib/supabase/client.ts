import { createBrowserClient } from "@supabase/ssr";

import { resolveApplyFlowSupabasePublicConfig } from "@/lib/persistence-v2/env";

/**
 * Browser Supabase client. Only for auth UI flows when Persistence V2 is enabled.
 * Never use service-role or DATABASE credentials here.
 */
export function createSupabaseBrowserClient() {
  const config = resolveApplyFlowSupabasePublicConfig();
  if (!config) {
    throw new Error("Supabase is not configured for this ApplyFlow deployment.");
  }
  return createBrowserClient(config.url, config.anonKey);
}
