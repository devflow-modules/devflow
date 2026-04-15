import { NextRequest } from "next/server";
import { jsonError, jsonSuccess, newTraceId } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { getAdminTenantAffiliatePanel } from "@/modules/affiliates/adminTenantAffiliatePanel";
import { ensureImplantationCommission, serializeCommissionAttempt } from "@/modules/affiliates/implantationCommission";
import { patchAdminTenantBodySchema } from "@/modules/affiliates/schemas";
import { authorizeProvisionOrPlatformAdmin } from "@/app/api/admin/whatsapp/provisionAuth";
import { parseCuidParam } from "@/lib/route-params";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const traceId = newTraceId();
  if (!(await authorizeProvisionOrPlatformAdmin(request))) {
    return jsonError("UNAUTHORIZED", "Não autorizado", 401, { traceId });
  }
  const { id: rawId } = await context.params;
  const tenantId = parseCuidParam(rawId);
  if (!tenantId) {
    return jsonError("NOT_FOUND", "Recurso não encontrado.", 404, { traceId });
  }
  try {
    const panel = await getAdminTenantAffiliatePanel(tenantId);
    if (!panel) {
      return jsonError("NOT_FOUND", "Tenant não encontrado.", 404, { traceId });
    }
    return jsonSuccess({ panel }, { traceId });
  } catch (e) {
    console.error("[GET /api/admin/tenants/[id]]", e);
    return jsonError("LOAD_FAILED", "Não foi possível carregar o tenant.", 500, { traceId });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const traceId = newTraceId();
  if (!(await authorizeProvisionOrPlatformAdmin(request))) {
    return jsonError("UNAUTHORIZED", "Não autorizado", 401, { traceId });
  }
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
  const parsed = patchAdminTenantBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; ") || "Dados inválidos.", 400, {
      traceId,
    });
  }

  try {
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: { implantationPriceBrl: parsed.data.implantationPriceBrl },
      select: { id: true, implantationPriceBrl: true, gtmLifecycle: true, affiliateId: true },
    });
    const commissionResult = await ensureImplantationCommission(tenant.id);
    return jsonSuccess({ tenant, ...serializeCommissionAttempt(commissionResult) }, { traceId });
  } catch (e: unknown) {
    const code = typeof e === "object" && e !== null && "code" in e ? (e as { code?: string }).code : undefined;
    if (code === "P2025") {
      return jsonError("NOT_FOUND", "Tenant não encontrado.", 404, { traceId });
    }
    console.error("[PATCH /api/admin/tenants/[id]]", e);
    return jsonError("UPDATE_FAILED", "Não foi possível atualizar o tenant.", 500, { traceId });
  }
}
