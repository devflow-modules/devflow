import { NextRequest } from "next/server";
import { jsonError, jsonSuccess, newTraceId } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { listCommissionsForAffiliate } from "@/modules/affiliates/adminAffiliatesService";
import { gatePlatformAdminOrProvisionSecret } from "@/lib/adminApiAuth";
import { parseCuidParam } from "@/lib/route-params";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const traceId = newTraceId();
  const gate = await gatePlatformAdminOrProvisionSecret(request);
  if (!gate.ok) return gate.response;
  const { id: rawId } = await context.params;
  const id = parseCuidParam(rawId);
  if (!id) {
    return jsonError("NOT_FOUND", "Recurso não encontrado.", 404, { traceId });
  }
  const exists = await prisma.affiliate.findUnique({ where: { id }, select: { id: true } });
  if (!exists) {
    return jsonError("NOT_FOUND", "Afiliado não encontrado.", 404, { traceId });
  }
  try {
    const commissions = await listCommissionsForAffiliate(id);
    return jsonSuccess({ commissions }, { traceId });
  } catch (e) {
    console.error("[GET /api/admin/affiliates/[id]/commissions]", e);
    return jsonError("LIST_FAILED", "Não foi possível listar comissões.", 500, { traceId });
  }
}
