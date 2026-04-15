import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonSuccess, newTraceId } from "@/lib/api-response";
import { authorizeProvisionOrPlatformAdmin } from "../../provisionAuth";
import { getPendingChannels } from "@/modules/whatsapp/channelActivationService";

export const dynamic = "force-dynamic";

const filterValues = ["all", "ok", "delay", "critical", "possibly_stuck"] as const;

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  filter: z.preprocess((v) => {
    if (typeof v !== "string") return "all";
    return filterValues.includes(v as (typeof filterValues)[number]) ? v : "all";
  }, z.enum(filterValues)),
});

/**
 * GET — fila de canais em PENDING_ACTIVATION (prioridade composta + filtro).
 * Auth: Bearer secret ou JWT `platform_admin`.
 */
export async function GET(request: NextRequest) {
  const traceId = newTraceId();
  if (!(await authorizeProvisionOrPlatformAdmin(request))) {
    return jsonError("UNAUTHORIZED", "Não autorizado", 401, { traceId });
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    filter: searchParams.get("filter"),
  });
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Parâmetros inválidos.", 400, { traceId });
  }

  try {
    const { items, total } = await getPendingChannels(parsed.data);
    return jsonSuccess(
      {
        items,
        page: parsed.data.page,
        limit: parsed.data.limit,
        total,
        filter: parsed.data.filter,
      },
      { traceId }
    );
  } catch (e) {
    console.error("[GET /api/admin/whatsapp/channels/pending]", e);
    return jsonError("LIST_FAILED", "Não foi possível listar a fila pendente.", 500, { traceId });
  }
}
