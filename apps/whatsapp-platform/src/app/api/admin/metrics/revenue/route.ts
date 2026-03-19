import { NextResponse } from "next/server";
import { isAdminMetricsAllowed } from "../adminAuth";
import { getRevenueMetrics } from "@/modules/analytics";

export async function GET(request: Request) {
  if (!isAdminMetricsAllowed(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const metrics = await getRevenueMetrics();
    return NextResponse.json(metrics);
  } catch (err) {
    console.error("[admin/metrics/revenue]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
