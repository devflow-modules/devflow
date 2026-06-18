import { NextRequest, NextResponse } from "next/server";
import {
  createBlockedCareerLlmResult,
  handleCareerLlmGenerate,
  parseCareerLlmGenerateRequest,
  resolveCareerLlmHttpStatus,
} from "@/lib/career-llm/career-llm-boundary";

/**
 * Server-side controlled LLM generation boundary.
 * Reconstructs chat normalization, agent orchestration, LLM task, policy, and provider
 * request server-side. Returns client-safe structured drafts only — never tool execution.
 */

export async function POST(request: NextRequest) {
  let body: unknown = null;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(createBlockedCareerLlmResult("invalid_json"), { status: 400 });
  }

  const parsed = parseCareerLlmGenerateRequest(body);
  if (!parsed.ok) {
    return NextResponse.json(createBlockedCareerLlmResult(parsed.error), {
      status: parsed.error === "invalid_json" ? 400 : 403,
    });
  }

  try {
    const result = await handleCareerLlmGenerate(parsed.request, new Date().toISOString());
    return NextResponse.json(result, {
      status: resolveCareerLlmHttpStatus(result),
    });
  } catch {
    return NextResponse.json(createBlockedCareerLlmResult("provider_request_failed"), { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(createBlockedCareerLlmResult("method_not_allowed"), { status: 405 });
}
