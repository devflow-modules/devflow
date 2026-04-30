import { NextRequest } from "next/server";
import { z } from "zod";
import { processFollowUps } from "@/modules/commercial";
import { auditOperationalAction } from "@/modules/operations/recordOperationalAudit";
import { gatePlatformAdminJwt } from "@/lib/adminApiAuth";
import { jsonError, jsonSuccess, newTraceId } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(25),
});

/**
 * Executa uma passagem imediata do worker de follow-ups (limite seguro).
 * Exclusivo `platform_admin` (área `/api/admin/*`).
 */
export async function POST(request: NextRequest) {
  const traceId = newTraceId();
  const gate = await gatePlatformAdminJwt(request);
  if (!gate.ok) return gate.response;

  const tenantId = gate.auth.payload.tenantId;
  const userId = gate.auth.payload.sub;
  if (!tenantId) {
    return jsonError("BAD_REQUEST", "Tenant não identificado", 400, { traceId });
  }

  let json: unknown = {};
  try {
    const t = await request.text();
    if (t.trim()) json = JSON.parse(t);
  } catch {
    return jsonError("INVALID_JSON", "JSON inválido", 400, { traceId });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      JSON.stringify(parsed.error.flatten()),
      400,
      { traceId }
    );
  }

  auditOperationalAction("operational_worker_manual_run", tenantId, userId, {
    limit: parsed.data.limit,
  });

  const result = await processFollowUps({ limit: parsed.data.limit, tenantId });

  return jsonSuccess(result, { traceId });
}
