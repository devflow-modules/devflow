import { NextResponse } from "next/server";
import { isAdminMetricsAllowed } from "../adminAuth";
import { getTopTenantsByUsage, toDateRange } from "@/modules/analytics";

function getRange(request: Request): { from: Date; to: Date } {
  const url = new URL(request.url);
  const period = url.searchParams.get("period") as "7d" | "30d" | null;
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  if (fromParam && toParam) {
    const from = new Date(fromParam);
    const to = new Date(toParam);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) return { from, to };
  }
  if (period === "7d" || period === "30d") {
    const range = toDateRange(period);
    return { from: range.from, to: range.to };
  }
  const range = toDateRange("30d");
  return { from: range.from, to: range.to };
}

export async function GET(request: Request) {
  if (!isAdminMetricsAllowed(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { from, to } = getRange(request);
    const limit = Math.min(20, Math.max(1, parseInt(new URL(request.url).searchParams.get("limit") ?? "10", 10)));
    const tenants = await getTopTenantsByUsage({ from, to }, limit);
    return NextResponse.json({
      from: from.toISOString(),
      to: to.toISOString(),
      tenants,
    });
  } catch (err) {
    console.error("[admin/metrics/tenants]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
