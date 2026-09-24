import { NextResponse, type NextRequest } from "next/server";

import { resolveAuthRedirect } from "@/lib/persistence-v2/auth/safe-redirect";
import { resolveApplyFlowSupabasePublicConfig } from "@/lib/persistence-v2/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function loginErrorRedirect(request: NextRequest, reason: string): NextResponse {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}

/**
 * Completes Supabase PKCE / email confirmation by exchanging `code` for a session.
 * Sets SSR cookies via the existing server client. Rejects open redirects.
 */
export async function GET(request: NextRequest) {
  if (!resolveApplyFlowSupabasePublicConfig()) {
    return loginErrorRedirect(request, "auth_not_configured");
  }

  const code = request.nextUrl.searchParams.get("code");
  const next = resolveAuthRedirect(request.nextUrl.searchParams.get("next"));

  if (!code) {
    return loginErrorRedirect(request, "missing_code");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return loginErrorRedirect(request, "exchange_failed");
  }

  // `next` is already constrained to a safe internal path.
  return NextResponse.redirect(new URL(next, request.url));
}
