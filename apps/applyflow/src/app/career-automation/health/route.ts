import { NextRequest, NextResponse } from "next/server";
import {
  probeCareerAutomationReachable,
  resolveCareerAutomationHealthStatus,
} from "@/lib/career-automation/career-automation-boundary";

/**
 * Client-safe approved-automation health/status. Returns only { enabled, provider,
 * configured, reachable, timeoutMs }. Never returns secrets, the OpenClaw base URL, or
 * internal IDs. OpenClaw is only contacted when an explicit, controlled probe is requested
 * (`?probe=true`); otherwise `reachable` stays null.
 */

export async function GET(request: NextRequest) {
  const status = resolveCareerAutomationHealthStatus();
  const probeRequested = new URL(request.url).searchParams.get("probe") === "true";

  if (probeRequested) {
    status.reachable = await probeCareerAutomationReachable();
  }

  return NextResponse.json(status, { status: 200 });
}

export async function POST() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
