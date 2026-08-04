import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import {
  listSendLedgerForAdmin,
  runOutboundSendReconcileJob,
} from "@/modules/inbox/outboundSendReconcileService";

export const dynamic = "force-dynamic";

const STATUSES = [
  "PENDING",
  "SENDING",
  "META_ACCEPTED",
  "COMPLETED",
  "FAILED_PRE_META",
  "UNKNOWN_OUTCOME",
] as const;

/**
 * Lista entradas do ledger de envio do tenant (sem texto da mensagem).
 * Roles: manager | platform_admin
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;

  const tenantId = auth!.payload.tenantId;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("limit") ?? "50", 10) || 50));
  const skip = Math.max(0, Number.parseInt(searchParams.get("skip") ?? "0", 10) || 0);
  const statusRaw = searchParams.get("status")?.trim();
  const status = STATUSES.includes(statusRaw as (typeof STATUSES)[number])
    ? (statusRaw as (typeof STATUSES)[number])
    : undefined;

  const data = await listSendLedgerForAdmin({ tenantId, status, skip, take: limit });
  return NextResponse.json({ success: true, data });
}

/**
 * Dispara reconciliação scoped ao tenant autenticado (sem Meta).
 * Body opcional: { dryRun?: boolean, limit?: number }
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;

  let dryRun = true;
  let limit = 50;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      dryRun?: boolean;
      limit?: number;
    };
    if (typeof body.dryRun === "boolean") dryRun = body.dryRun;
    if (typeof body.limit === "number") limit = body.limit;
  } catch {
    /* defaults */
  }

  const counts = await runOutboundSendReconcileJob({
    tenantId: auth!.payload.tenantId,
    dryRun,
    limit,
  });

  return NextResponse.json({ success: true, dryRun, counts });
}
