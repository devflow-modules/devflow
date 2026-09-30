import { NextResponse } from "next/server";

import { searchJobSources } from "@/lib/job-sources/runtime";
import { jobSearchHttpStatus } from "@/lib/job-sources/search-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_criteria" }, { status: 400 });
  }
  const result = await searchJobSources(raw);
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
