import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { getManagerDashboard } from "@/modules/metrics/managerDashboardService";
import type { DateRange } from "@/modules/metrics/metricsService";

function parseRange(searchParams: URLSearchParams): DateRange | undefined {
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  if (!dateFrom && !dateTo) return undefined;
  return {
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(dateTo) : undefined,
  };
}

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const range = parseRange(request.nextUrl.searchParams);

  try {
    const data = await getManagerDashboard(auth.payload.tenantId, range);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[metrics/manager-dashboard]", err);
    return NextResponse.json({ error: "Erro ao buscar dashboard gerencial" }, { status: 500 });
  }
}
