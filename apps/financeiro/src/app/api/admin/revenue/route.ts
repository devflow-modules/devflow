import { NextResponse } from "next/server";
import { getRevenueMetrics } from "@/modules/revenue";

function isAllowed(request: Request): boolean {
  if (process.env.NODE_ENV === "development") return true;
  const secret = process.env.ADMIN_METRICS_SECRET;
  if (!secret) return false;
  return request.headers.get("x-admin-metrics-secret") === secret;
}

export async function GET(request: Request) {
  if (!isAllowed(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const metrics = await getRevenueMetrics();

    return NextResponse.json({
      mrr: metrics.totalMRR,
      arr: metrics.totalARR,
      proMRR: metrics.proMRR,
      teamMRR: metrics.teamMRR,
      arpu: metrics.arpu,
      churnRate: metrics.churnRate,
      upgradeRate: metrics.upgradeRate,
      planDistribution: metrics.planDistribution,
    });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
