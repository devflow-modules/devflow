import { NextRequest, NextResponse } from "next/server";
import {
  careerLogger,
  careerMetrics,
  createCareerCorrelationId,
  resolveCareerSystemHealth,
} from "@/lib/career-system";

/**
 * Aggregated, client-safe Career Suite health. Combines the state of existing boundaries
 * (agents, chat, llm, automation, provider metadata, database). No external probe runs by
 * default — pass `?probe=true` for a bounded reachability check. Never generates tokens, runs
 * tools, returns provider payloads, or persists anything. `POST` → 405.
 */
export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const correlationId = createCareerCorrelationId();
  const probe = new URL(request.url).searchParams.get("probe") === "true";

  const health = await resolveCareerSystemHealth({ probe });

  const event = careerLogger.info({
    eventName: "career_health_probe_completed",
    route: "/career-system/health",
    outcome: health.status === "unhealthy" ? "error" : "success",
    durationMs: Date.now() - startedAt,
    correlationId,
    externalProviderCalled: probe,
  });
  careerMetrics.recordEvent(event);

  const httpStatus = health.status === "unhealthy" ? 503 : 200;
  return NextResponse.json(
    { ...health, correlationId },
    { status: httpStatus, headers: { "x-career-correlation-id": correlationId } },
  );
}

export async function POST() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
