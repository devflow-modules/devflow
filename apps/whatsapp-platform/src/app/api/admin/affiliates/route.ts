import { NextRequest } from "next/server";
import { jsonError, jsonSuccess, newTraceId } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { listAffiliatesWithStats } from "@/modules/affiliates/adminAffiliatesService";
import { createAffiliateBodySchema } from "@/modules/affiliates/schemas";
import { authorizeProvisionOrPlatformAdmin } from "../whatsapp/provisionAuth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const traceId = newTraceId();
  if (!(await authorizeProvisionOrPlatformAdmin(request))) {
    return jsonError("UNAUTHORIZED", "Não autorizado", 401, { traceId });
  }
  try {
    const affiliates = await listAffiliatesWithStats();
    return jsonSuccess({ affiliates }, { traceId });
  } catch (e) {
    console.error("[GET /api/admin/affiliates]", e);
    return jsonError("LIST_FAILED", "Não foi possível listar afiliados.", 500, { traceId });
  }
}

export async function POST(request: NextRequest) {
  const traceId = newTraceId();
  if (!(await authorizeProvisionOrPlatformAdmin(request))) {
    return jsonError("UNAUTHORIZED", "Não autorizado", 401, { traceId });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Corpo JSON inválido.", 400, { traceId });
  }
  const parsed = createAffiliateBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; ") || "Dados inválidos.", 400, {
      traceId,
    });
  }
  const { name, email, phone, commissionRate } = parsed.data;
  try {
    const affiliate = await prisma.affiliate.create({
      data: {
        name,
        email: email ?? null,
        phone: phone != null ? phone : null,
        commissionRate,
      },
    });
    return jsonSuccess({ affiliate }, { traceId, status: 201 });
  } catch (e) {
    console.error("[POST /api/admin/affiliates]", e);
    return jsonError("CREATE_FAILED", "Não foi possível criar o afiliado.", 500, { traceId });
  }
}
