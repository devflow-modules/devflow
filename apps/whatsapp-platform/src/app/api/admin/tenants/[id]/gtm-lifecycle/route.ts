import { NextRequest } from "next/server";
import { TenantGtmLifecycle } from "@/generated/prisma-whatsapp";
import { jsonError, jsonSuccess, newTraceId } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { ensureImplantationCommission, serializeCommissionAttempt } from "@/modules/affiliates/implantationCommission";
import { patchGtmLifecycleBodySchema } from "@/modules/affiliates/schemas";
import { gatePlatformAdminOrProvisionSecret } from "@/lib/adminApiAuth";
import { parseCuidParam } from "@/lib/route-params";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const traceId = newTraceId();
  const gate = await gatePlatformAdminOrProvisionSecret(request);
  if (!gate.ok) return gate.response;
  const { id: rawId } = await context.params;
  const tenantId = parseCuidParam(rawId);
  if (!tenantId) {
    return jsonError("NOT_FOUND", "Recurso não encontrado.", 404, { traceId });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Corpo JSON inválido.", 400, { traceId });
  }
  const parsed = patchGtmLifecycleBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; ") || "Dados inválidos.", 400, {
      traceId,
    });
  }
  const nextLifecycle =
    parsed.data.gtmLifecycle === "IMPLANTADO" ? TenantGtmLifecycle.IMPLANTADO : TenantGtmLifecycle.AVALIACAO;

  try {
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: { gtmLifecycle: nextLifecycle },
      select: { id: true, gtmLifecycle: true, affiliateId: true },
    });
    if (tenant.gtmLifecycle === TenantGtmLifecycle.IMPLANTADO) {
      const commissionResult = await ensureImplantationCommission(tenant.id);
      return jsonSuccess({ tenant, ...serializeCommissionAttempt(commissionResult) }, { traceId });
    }
    return jsonSuccess(
      {
        tenant,
        commission: null,
        commissionCreated: false,
        commissionSkippedReason: null as null,
      },
      { traceId }
    );
  } catch (e: unknown) {
    const code = typeof e === "object" && e !== null && "code" in e ? (e as { code?: string }).code : undefined;
    if (code === "P2025") {
      return jsonError("NOT_FOUND", "Tenant não encontrado.", 404, { traceId });
    }
    console.error("[PATCH /api/admin/tenants/[id]/gtm-lifecycle]", e);
    return jsonError("UPDATE_FAILED", "Não foi possível atualizar o ciclo GTM.", 500, { traceId });
  }
}
