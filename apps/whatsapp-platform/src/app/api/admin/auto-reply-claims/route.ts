import { NextRequest, NextResponse } from "next/server";
import {
  WaAutoReplyClaimStatus,
  WaAutoReplyClaimTrigger,
} from "@/generated/prisma-whatsapp";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, requireRole, ROLES_PLATFORM_ONLY } from "@/modules/auth";
import { listWaAutoReplyClaimsForAdmin } from "@/modules/messaging/automaticReplyClaimDiagnosticsService";
import { getWaAutoReplyClaimMetricsSnapshot } from "@/modules/messaging/automaticReplyClaimInstrumentation";

export const dynamic = "force-dynamic";

function parseEnum<T extends string>(raw: string | null, allowed: readonly T[]): T | undefined {
  if (!raw) return undefined;
  return allowed.includes(raw as T) ? (raw as T) : undefined;
}

function parseDate(raw: string | null): Date | undefined {
  if (!raw?.trim()) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * Lista wa_auto_reply_claims do tenant autenticado (sem claimToken). Paginação: skip/limit.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    const denied = requireRole(auth, ROLES_PLATFORM_ONLY, request);
    if (denied) return denied;

    const tenantId = auth!.payload.tenantId;
    const { searchParams } = new URL(request.url);

    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(searchParams.get("limit") ?? "50", 10) || 50)
    );
    const skip = Math.max(0, Number.parseInt(searchParams.get("skip") ?? "0", 10) || 0);

    const threadId = searchParams.get("threadId")?.trim() || undefined;
    const inboundWaMessageId = searchParams.get("inboundWaMessageId")?.trim() || undefined;

    const status = parseEnum(searchParams.get("status"), [
      "PENDING",
      "SENT",
      "FAILED",
      "EXPIRED",
    ] as const) as WaAutoReplyClaimStatus | undefined;

    const triggerSource = parseEnum(searchParams.get("triggerSource"), [
      "LEGACY",
      "AI",
      "AUTOMATION",
    ] as const) as WaAutoReplyClaimTrigger | undefined;

    const createdFrom = parseDate(searchParams.get("createdFrom"));
    const createdTo = parseDate(searchParams.get("createdTo"));

    const { items, total } = await listWaAutoReplyClaimsForAdmin(prisma, {
      tenantId,
      threadId,
      inboundWaMessageId,
      triggerSource,
      status,
      createdFrom,
      createdTo,
      skip,
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: {
        claims: items,
        total,
        skip,
        limit,
        metrics: getWaAutoReplyClaimMetricsSnapshot(),
      },
    });
  } catch (err) {
    console.error("[admin/auto-reply-claims]", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 }
    );
  }
}
