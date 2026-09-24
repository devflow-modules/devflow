import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { resolveApplyFlowSupabasePublicConfig } from "@/lib/persistence-v2/env";

type CookieOption = { name: string; value: string; options?: Record<string, unknown> };

/**
 * Refreshes Supabase session cookies when public Supabase config is present.
 * Does NOT enforce auth on dashboard routes (V1 stays anonymous/local-first).
 */
export async function updateSupabaseSession(request: NextRequest) {
  const config = resolveApplyFlowSupabasePublicConfig();
  if (!config) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieOption[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getUser();
  return supabaseResponse;
}
