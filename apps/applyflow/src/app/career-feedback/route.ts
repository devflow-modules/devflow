import { NextRequest, NextResponse } from "next/server";
import { careerLogger, careerMetrics, handleCareerFeedback } from "@/lib/career-system";

/**
 * Explicit, consent-gated pilot feedback. Stores only when `consentToStore` is true; otherwise
 * the payload is validated and discarded (default repository is `discard`, so nothing is
 * persisted). No resume, no full job description, no provider payload, no required email, no
 * hidden analytics. `GET` → 405.
 */
export async function POST(request: NextRequest) {
  const startedAt = Date.now();

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const result = await handleCareerFeedback(body);

  const event = careerLogger.info({
    eventName: "career_feedback_submitted",
    route: "/career-feedback",
    outcome: result.status === "rejected" ? "error" : "success",
    durationMs: Date.now() - startedAt,
    correlationId: result.correlationId,
    errorCode: result.errorCode,
  });
  careerMetrics.recordEvent(event);

  const httpStatus = result.status === "rejected" ? 400 : 200;
  return NextResponse.json(result, {
    status: httpStatus,
    headers: { "x-career-correlation-id": result.correlationId },
  });
}

export function GET() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
