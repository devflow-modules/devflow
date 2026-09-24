import { NextResponse } from "next/server";
import { resolveCareerReadinessWithPersistence } from "@/lib/career-system/health";

/**
 * Readiness probe. Confirms the app initialized, required config is valid, internal boundaries
 * are loaded, and (when configured) the database is considered reachable. It does NOT run
 * generation, an agent, a tool, or an automation. Returns 503 when not ready. `POST` → 405.
 */
export async function GET() {
  const readiness = await resolveCareerReadinessWithPersistence();
  const status = readiness.status === "ready" ? 200 : 503;
  return NextResponse.json(readiness, { status });
}

export function POST() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
