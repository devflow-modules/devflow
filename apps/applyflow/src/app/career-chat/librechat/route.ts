import { NextRequest, NextResponse } from "next/server";
import { createBlockedCareerChatResponse } from "@/lib/career-chat/career-chat-librechat-boundary";
import { handleLibreChatTransportRequest } from "@/lib/career-chat/librechat-transport/boundary";

/**
 * Server-side LibreChat adapter boundary.
 * Accepts UI and LibreChat transport payloads, delivers to the existing career-chat
 * boundary, and returns client-safe proposals only.
 */

export async function POST(request: NextRequest) {
  let body: unknown = null;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(createBlockedCareerChatResponse("invalid_json"), { status: 400 });
  }

  try {
    const result = await handleLibreChatTransportRequest({
      body,
      headers: request.headers,
      requestedAt: new Date().toISOString(),
    });

    return NextResponse.json(result.payload, {
      status: result.httpStatus,
    });
  } catch {
    return NextResponse.json(createBlockedCareerChatResponse("adapter_failed"), { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(createBlockedCareerChatResponse("method_not_allowed"), { status: 405 });
}
