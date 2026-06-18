import { NextRequest, NextResponse } from "next/server";
import {
  createBlockedCareerAutomationResult,
  handleCareerAutomationExecute,
  parseCareerAutomationExecuteRequest,
  resolveCareerAutomationHttpStatus,
} from "@/lib/career-automation/career-automation-boundary";

/**
 * Server-side approved automation execution boundary.
 * Reconstructs the agent execution plan, automation proposal, tool definition,
 * capability mapping, approval, and automation policy server-side. Executes exactly
 * one permitted, non-destructive tool. No scheduling, queue, worker, background
 * processing, or persistence. Returns client-safe JSON only.
 */

export async function POST(request: NextRequest) {
  let body: unknown = null;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(createBlockedCareerAutomationResult("invalid_json"), { status: 400 });
  }

  const parsed = parseCareerAutomationExecuteRequest(body);
  if (!parsed.ok) {
    return NextResponse.json(createBlockedCareerAutomationResult(parsed.error), {
      status: parsed.error === "invalid_json" ? 400 : 403,
    });
  }

  try {
    const result = await handleCareerAutomationExecute(parsed.request, new Date().toISOString());
    return NextResponse.json(result, {
      status: resolveCareerAutomationHttpStatus(result),
    });
  } catch {
    return NextResponse.json(createBlockedCareerAutomationResult("automation_execution_failed"), {
      status: 500,
    });
  }
}

export async function GET() {
  return NextResponse.json(createBlockedCareerAutomationResult("method_not_allowed"), { status: 405 });
}
