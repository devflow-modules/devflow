import { NextRequest, NextResponse } from "next/server";
import {
  createBlockedCareerChatResponse,
  handleCareerChatLibrechat,
  isLibreChatAdapterEnabled,
  parseCareerChatLibrechatRequest,
  resolveCareerChatLibrechatHttpStatus,
} from "@/lib/career-chat/career-chat-librechat-boundary";

/**
 * Server-side LibreChat adapter boundary.
 * Normalizes chat input, routes to career agent orchestrator, and returns tool proposals only.
 */

export async function POST(request: NextRequest) {
  let body: unknown = null;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(createBlockedCareerChatResponse("invalid_json"), { status: 400 });
  }

  const parsed = parseCareerChatLibrechatRequest(body);
  if (!parsed.ok) {
    return NextResponse.json(createBlockedCareerChatResponse(parsed.error), {
      status: parsed.error === "invalid_json" ? 400 : 403,
    });
  }

  try {
    const result = handleCareerChatLibrechat(
      parsed.request,
      new Date().toISOString(),
      isLibreChatAdapterEnabled(),
    );
    return NextResponse.json(result, {
      status: resolveCareerChatLibrechatHttpStatus(result),
    });
  } catch {
    return NextResponse.json(createBlockedCareerChatResponse("adapter_failed"), { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(createBlockedCareerChatResponse("method_not_allowed"), { status: 405 });
}
