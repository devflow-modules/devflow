import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import { prisma } from "@/lib/prisma";
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

async function assertManagerDashboardFiltersBelongToTenant(
  tenantId: string,
  opts: { queueId?: string; businessPhoneNumberId?: string }
): Promise<boolean> {
  const { queueId, businessPhoneNumberId } = opts;

  if (queueId && queueId !== "none") {
    const queue = await prisma.waInboxQueue.findFirst({
      where: { id: queueId, tenantId },
      select: { id: true },
    });
    if (!queue) return false;
  }

  if (businessPhoneNumberId) {
    const line = await prisma.whatsappPhoneNumber.findFirst({
      where: { tenantId, phoneNumberId: businessPhoneNumberId },
      select: { id: true },
    });
    if (!line) return false;
  }

  return true;
}

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;

  const search = request.nextUrl.searchParams;
  const range = parseRange(search);
  const queueIdRaw = search.get("queueId")?.trim();
  const businessPhoneNumberId = search.get("businessPhoneNumberId")?.trim() || undefined;
  const hasQueueFilter = Boolean(queueIdRaw);
  const hasBusinessPhoneFilter = Boolean(businessPhoneNumberId);

  const input: DateRange | ManagerDashboardSearchOpts | undefined =
    range === undefined && !hasQueueFilter && !hasBusinessPhoneFilter
      ? undefined
      : hasQueueFilter || hasBusinessPhoneFilter
        ? { range, queueId: queueIdRaw, businessPhoneNumberId }
        : range;

  try {
    const tenantId = auth!.payload.tenantId;
    const filtersBelongToTenant = await assertManagerDashboardFiltersBelongToTenant(tenantId, {
      queueId: queueIdRaw,
      businessPhoneNumberId,
    });
    if (!filtersBelongToTenant) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const data = await getManagerDashboard(tenantId, input);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[metrics/manager-dashboard]", err);
    return NextResponse.json({ error: "Erro ao buscar dashboard gerencial" }, { status: 500 });
  }
}
