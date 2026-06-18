import { NextRequest, NextResponse } from "next/server";
import {
  probeCareerLlmReachable,
  resolveCareerLlmHealthStatus,
} from "@/lib/career-llm/career-llm-boundary";

/**
 * Client-safe controlled LLM health/status. Returns only { enabled, provider, configured,
 * modelAlias, reachable }. Never returns secrets, the raw model id, or internal URLs. The
 * provider API is only contacted when an explicit, controlled probe is requested
 * (`?probe=true`); otherwise `reachable` stays null.
 */

export async function GET(request: NextRequest) {
  const status = resolveCareerLlmHealthStatus();
  const probeRequested = new URL(request.url).searchParams.get("probe") === "true";

  if (probeRequested) {
    status.reachable = await probeCareerLlmReachable();
  }

  return NextResponse.json(status, { status: 200 });
}

export async function POST() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
