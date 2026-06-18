import { NextResponse } from "next/server";
import { resolveLibreChatTransportHealth } from "@/lib/career-chat/librechat-transport/boundary";

/**
 * Internal LibreChat transport health/status (client-safe, no secrets).
 */

export async function GET() {
  const status = await resolveLibreChatTransportHealth();
  return NextResponse.json(status, { status: 200 });
}

export async function POST() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
