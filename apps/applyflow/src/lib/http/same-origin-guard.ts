import { NextResponse } from "next/server";

import {
  evaluateNangoRequestOrigin,
  resolveAllowedNangoOrigins,
} from "@/lib/provider-runtime/nango-request-guard";

export type SameOriginGuardOptions = {
  /**
   * JSON error body when Origin is rejected.
   * Search uses provider_* codes; V2 mutating routes use csrf_rejected.
   */
  rejectError?: string;
  misconfiguredError?: string;
  env?: NodeJS.ProcessEnv;
};

/**
 * Central Origin allowlist guard for cookie-authenticated mutating routes.
 * Reuses the Nango origin resolver (server-configured origins only).
 *
 * Hosted (Vercel production/preview): missing Origin fails closed.
 * Local/dev: missing Origin allowed for non-browser tooling/tests.
 */
export function enforceSameOriginMutatingRequest(
  request: Request,
  options: SameOriginGuardOptions = {},
): NextResponse | null {
  const env = options.env ?? process.env;
  const rejectError = options.rejectError ?? "csrf_rejected";
  const misconfiguredError = options.misconfiguredError ?? "origin_misconfigured";

  const allowed = resolveAllowedNangoOrigins(env);
  if (!allowed.ok) {
    return NextResponse.json({ error: misconfiguredError }, { status: 503 });
  }

  const origin = evaluateNangoRequestOrigin({
    originHeader: request.headers.get("origin"),
    allowedOrigins: allowed.origins,
  });

  if (origin.ok) return null;

  if (origin.reason === "cross_origin_forbidden") {
    return NextResponse.json({ error: rejectError }, { status: 403 });
  }

  const hosted = env.VERCEL_ENV === "production" || env.VERCEL_ENV === "preview";
  if (hosted) {
    return NextResponse.json({ error: rejectError }, { status: 403 });
  }

  return null;
}
