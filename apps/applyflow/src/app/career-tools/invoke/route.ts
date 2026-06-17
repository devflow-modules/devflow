import { NextRequest, NextResponse } from "next/server";
import {
  createBlockedCareerToolResult,
  handleCareerToolInvoke,
  parseCareerToolInvokeRequest,
  resolveCareerToolInvokeHttpStatus,
} from "@/lib/career-tools/career-tool-invoke-boundary";

/**
 * Server-side career tool invocation boundary.
 * Resolves tool definitions, capabilities, and permissions server-side only.
 */

export async function POST(request: NextRequest) {
  let body: unknown = null;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(createBlockedCareerToolResult("invalid_json"), { status: 400 });
  }

  const parsed = parseCareerToolInvokeRequest(body);
  if (!parsed.ok) {
    return NextResponse.json(createBlockedCareerToolResult(parsed.error), {
      status: parsed.error === "invalid_json" ? 400 : 403,
    });
  }

  try {
    const result = handleCareerToolInvoke(parsed.request, new Date().toISOString());
    return NextResponse.json(result, {
      status: resolveCareerToolInvokeHttpStatus(result),
    });
  } catch {
    return NextResponse.json(createBlockedCareerToolResult("invoke_failed"), { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(createBlockedCareerToolResult("method_not_allowed"), { status: 405 });
}
