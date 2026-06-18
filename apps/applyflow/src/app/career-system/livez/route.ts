import { NextResponse } from "next/server";
import { resolveCareerLiveness } from "@/lib/career-system";

/**
 * Liveness probe. Confirms only that the process responds. It never calls OpenAI, LibreChat,
 * Nango, Gmail, Calendar, tools, or runs a heavy database query. `POST` → 405.
 */
export function GET() {
  return NextResponse.json(resolveCareerLiveness(), { status: 200 });
}

export function POST() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
