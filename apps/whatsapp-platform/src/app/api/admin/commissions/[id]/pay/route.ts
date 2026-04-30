import { NextRequest } from "next/server";
import { jsonError, jsonSuccess, newTraceId } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { recordPlatformAudit } from "@/lib/platformAuditLog";
import { patchCommissionPayBodySchema } from "@/modules/affiliates/schemas";
import { logEvent } from "@/lib/observability/log-event";
import { parseCuidParam } from "@/lib/route-params";
import { getClientIp } from "@/lib/rate-limit";
import { gatePlatformAdminOrProvisionSecret } from "@/lib/adminApiAuth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const traceId = newTraceId();
  const gate = await gatePlatformAdminOrProvisionSecret(request);
  if (!gate.ok) return gate.response;

  const { id: rawId } = await context.params;
  const commissionId = parseCuidParam(rawId);
  if (!commissionId) {
    return jsonError("NOT_FOUND", "Recurso não encontrado.", 404, { traceId });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Corpo JSON inválido.", 400, { traceId });
  }
  const parsed = patchCommissionPayBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; ") || "Dados inválidos.", 400, {
      traceId,
    });
  }

  try {
    const current = await prisma.commission.findUnique({
      where: { id: commissionId },
      select: { id: true, status: true, tenantId: true, affiliateId: true, amount: true },
    });
    if (!current) {
      return jsonError("NOT_FOUND", "Comissão não encontrada.", 404, { traceId });
    }
    if (current.status === "pago") {
      const commission = await prisma.commission.findUnique({ where: { id: commissionId } });
      return jsonSuccess({ commission, alreadyPaid: true as const }, { traceId });
    }
    if (current.status !== "pendente") {
      return jsonError(
        "INVALID_STATE",
        "Só é possível pagar comissões em estado «pendente».",
        409,
        { traceId }
      );
    }
    const commission = await prisma.commission.update({
      where: { id: commissionId },
      data: { status: "pago" },
    });
    recordPlatformAudit({
      action: "affiliate.commission.paid",
      tenantId: current.tenantId,
      userId: gate.auth?.payload.sub ?? null,
      resourceType: "commission",
      resourceId: commission.id,
      ip: getClientIp(request),
      metadata: {
        affiliateId: current.affiliateId,
        amount: current.amount,
        authVia: gate.viaProvisionSecret ? "provision_bearer" : "platform_admin_session",
      },
    });
    return jsonSuccess({ commission, alreadyPaid: false as const }, { traceId });
  } catch (e: unknown) {
    console.error("[PATCH /api/admin/commissions/[id]/pay]", e);
    logEvent("error", "admin", "commission_pay_failed", { commissionId, traceId });
    return jsonError("UPDATE_FAILED", "Não foi possível marcar como pago.", 500, { traceId });
  }
}
