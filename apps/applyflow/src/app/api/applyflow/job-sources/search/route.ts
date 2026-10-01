import { NextResponse } from "next/server";

import { authorizeJobSearchProvider, resolveJobSearchCaller } from "@/lib/job-sources/search-access";
import { parseJobSearchCriteria } from "@/lib/job-sources/criteria";
import { searchJobSources } from "@/lib/job-sources/runtime";
import { jobSearchHttpStatus } from "@/lib/job-sources/search-service";
import { isTheirStackSearchEnabled } from "@/lib/job-sources/theirstack-access";
import { captureApplyFlowServerException } from "@/lib/observability/error-tracking";
import {
  evaluateNangoRequestOrigin,
  resolveAllowedNangoOrigins,
} from "@/lib/provider-runtime/nango-request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function enforceSameOrigin(request: Request): NextResponse | null {
  const allowed = resolveAllowedNangoOrigins(process.env);
  if (!allowed.ok) {
    // Hosted misconfiguration: fail closed for mutating search.
    return NextResponse.json({ error: "provider_unavailable" }, { status: 503 });
  }
  const origin = evaluateNangoRequestOrigin({
    originHeader: request.headers.get("origin"),
    allowedOrigins: allowed.origins,
  });
  if (!origin.ok) {
    // Same-origin browser fetch always sends Origin. Non-browser tooling may omit it;
    // closed-beta policy: reject cross-origin, allow missing Origin only in local/dev.
    if (origin.reason === "cross_origin_forbidden") {
      return NextResponse.json({ error: "provider_rejected" }, { status: 403 });
    }
    const hosted =
      process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview";
    if (hosted) {
      return NextResponse.json({ error: "provider_rejected" }, { status: 403 });
    }
  }
  return null;
}

export async function POST(request: Request) {
  const originBlock = enforceSameOrigin(request);
  if (originBlock) return originBlock;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_criteria" }, { status: 400 });
  }

  try {
    const criteria = parseJobSearchCriteria(raw);
    if (!criteria) {
      return NextResponse.json({ error: "invalid_criteria" }, { status: 400 });
    }

    const callerResult = await resolveJobSearchCaller();
    if (!callerResult.ok) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }

    const authorized = authorizeJobSearchProvider(criteria.provider, callerResult.caller);
    if (!authorized.ok) {
      return NextResponse.json(
        { error: authorized.error },
        { status: jobSearchHttpStatus(authorized.error) },
      );
    }

    const authProviderSub =
      callerResult.caller.kind === "authenticated" ? callerResult.caller.authProviderSub : null;

    const result = await searchJobSources(raw, {
      authProviderSub,
      allowAnonymousFreeProviders: callerResult.caller.kind === "anonymous_local",
      theirStackEnabled: isTheirStackSearchEnabled(),
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: jobSearchHttpStatus(result.error) });
    }
    return NextResponse.json({
      provider: result.page.provider,
      page: result.page.page,
      limit: result.page.limit,
      hasMore: result.page.hasMore,
      cached: result.cached,
      hits: result.page.hits,
    });
  } catch (error) {
    captureApplyFlowServerException(error, {
      route: "/api/applyflow/job-sources/search",
      statusCode: 500,
    });
    return NextResponse.json({ error: "provider_unavailable" }, { status: 503 });
  }
}
