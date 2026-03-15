import { getCounters as getFinanceCounters } from "@/modules/financeiro/adapters/metrics/financeMetrics";
import { getCounters as getGrowthCounters } from "@/analytics/growth/growthMetrics";
import { NextResponse } from "next/server";

function isAllowed(request: Request): boolean {
  if (process.env.NODE_ENV === "development") return true;
  const secret = process.env.ADMIN_METRICS_SECRET;
  if (!secret) return false;
  const header = request.headers.get("x-admin-metrics-secret");
  return header === secret;
}

export async function GET(request: Request) {
  if (!isAllowed(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const finance = { metrics: getFinanceCounters() };
  const growth = { metrics: getGrowthCounters() };

  return NextResponse.json({ finance, growth });
}
