import { NextResponse } from "next/server";

import { authorizeJobSearchProvider, resolveJobSearchCaller } from "@/lib/job-sources/search-access";
import { parseJobSearchCriteria } from "@/lib/job-sources/criteria";
import { searchJobSources } from "@/lib/job-sources/runtime";
import { jobSearchHttpStatus } from "@/lib/job-sources/search-service";
import { isTheirStackSearchEnabled } from "@/lib/job-sources/theirstack-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_criteria" }, { status: 400 });
  }

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
}
