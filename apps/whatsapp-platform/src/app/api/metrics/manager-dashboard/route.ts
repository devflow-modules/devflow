import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import {
  getManagerDashboard,
  type ManagerDashboardSearchOpts,
} from "@/modules/metrics/managerDashboardService";
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
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;

  const search = request.nextUrl.searchParams;
  const range = parseRange(search);
  const queueIdRaw = search.get("queueId")?.trim();
  const hasQueueFilter = Boolean(queueIdRaw);

  const input: DateRange | ManagerDashboardSearchOpts | undefined =
    range === undefined && !hasQueueFilter
      ? undefined
      : hasQueueFilter
        ? { range, queueId: queueIdRaw }
        : range;

  try {
    const data = await getManagerDashboard(auth!.payload.tenantId, input);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[metrics/manager-dashboard]", err);
    return NextResponse.json({ error: "Erro ao buscar dashboard gerencial" }, { status: 500 });
  }
}
