import { createBrowserClient } from "@supabase/ssr";

import { resolveApplyFlowSupabasePublicConfig } from "@/lib/persistence-v2/env";

/**
 * Browser Supabase client. Only for auth UI flows when Persistence V2 is enabled.
 * Never use service-role or DATABASE credentials here.
 */
export function createSupabaseBrowserClient() {
  // Pass static NEXT_PUBLIC_* reads so webpack/Next can inline them for the browser.
  const config = resolveApplyFlowSupabasePublicConfig({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  if (!config) {
    throw new Error("Supabase is not configured for this ApplyFlow deployment.");
  }
  return createBrowserClient(config.url, config.publishableKey);
}
