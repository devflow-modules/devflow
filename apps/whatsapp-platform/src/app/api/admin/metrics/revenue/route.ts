import { NextRequest, NextResponse } from "next/server";
import { gatePlatformAdminJwt } from "@/lib/adminApiAuth";
import { getRevenueMetrics } from "@/modules/analytics";

export async function GET(request: NextRequest) {
  const gate = await gatePlatformAdminJwt(request);
  if (!gate.ok) return gate.response;
  try {
    const metrics = await getRevenueMetrics();
    return NextResponse.json(metrics);
  } catch (err) {
    console.error("[admin/metrics/revenue]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
