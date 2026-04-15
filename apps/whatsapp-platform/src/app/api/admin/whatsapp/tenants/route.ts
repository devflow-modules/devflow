import { NextRequest } from "next/server";
import { jsonError, jsonSuccess, newTraceId } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { authorizeProvisionOrPlatformAdmin } from "../provisionAuth";

export const dynamic = "force-dynamic";

/**
 * GET — lista tenants (id + nome) para o select de provisionamento.
 * Auth: Bearer secret ou JWT `platform_admin`.
 */
export async function GET(request: NextRequest) {
  const traceId = newTraceId();
  if (!(await authorizeProvisionOrPlatformAdmin(request))) {
    return jsonError("UNAUTHORIZED", "Não autorizado", 401, { traceId });
  }

  try {
    const tenants = await prisma.tenant.findMany({
      select: { id: true, name: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    return jsonSuccess({ tenants }, { traceId });
  } catch (e) {
    console.error("[GET /api/admin/whatsapp/tenants]", e);
    return jsonError("LIST_FAILED", "Não foi possível listar os tenants.", 500, { traceId });
  }
}
