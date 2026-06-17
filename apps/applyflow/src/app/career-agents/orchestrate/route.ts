import { NextRequest, NextResponse } from "next/server";
import {
  createBlockedCareerAgentResult,
  handleCareerAgentOrchestration,
  parseCareerAgentOrchestrationRequest,
  resolveCareerAgentOrchestrationHttpStatus,
} from "@/lib/career-agents/career-agent-orchestration-boundary";

/**
 * Server-side career agent orchestration boundary.
 * Validates structured input, evaluates policies, and returns client-safe results only.
 */

export async function POST(request: NextRequest) {
  let body: unknown = null;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(createBlockedCareerAgentResult("invalid_json"), { status: 400 });
  }

  const parsed = parseCareerAgentOrchestrationRequest(body);
  if (!parsed.ok) {
    return NextResponse.json(createBlockedCareerAgentResult(parsed.error), {
      status: parsed.error === "invalid_json" ? 400 : 403,
    });
  }

  try {
    const result = handleCareerAgentOrchestration(parsed.request, new Date().toISOString());
    return NextResponse.json(result, {
      status: resolveCareerAgentOrchestrationHttpStatus(result),
    });
  } catch {
    return NextResponse.json(createBlockedCareerAgentResult("orchestration_failed"), { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(createBlockedCareerAgentResult("method_not_allowed"), { status: 405 });
}
