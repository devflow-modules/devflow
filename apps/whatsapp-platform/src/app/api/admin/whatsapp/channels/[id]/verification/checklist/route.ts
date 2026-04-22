import { NextRequest } from "next/server";
import { jsonError, jsonSuccess, newTraceId } from "@/lib/api-response";
import { updateVerificationChecklist } from "@/modules/whatsapp/verificationService";
import { authorizeProvisionOrPlatformAdmin } from "../../../../provisionAuth";

export const dynamic = "force-dynamic";

function parseUpdates(body: unknown): Record<string, boolean> | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const updates = o.updates;
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) return null;
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(updates as Record<string, unknown>)) {
    if (typeof v === "boolean") out[k] = v;
  }
  return Object.keys(out).length ? out : null;
}

/**
 * POST — atualiza itens da checklist (`{ updates: { [itemId]: boolean } }`).
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const traceId = newTraceId();
  if (!(await authorizeProvisionOrPlatformAdmin(request))) {
    return jsonError("UNAUTHORIZED", "Não autorizado", 401, { traceId });
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return jsonError("VALIDATION_ERROR", "ID inválido.", 400, { traceId });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("VALIDATION_ERROR", "JSON inválido.", 400, { traceId });
  }

  const updates = parseUpdates(body);
  if (!updates) {
    return jsonError("VALIDATION_ERROR", "Campo «updates» (objecto de booleans) é obrigatório.", 400, { traceId });
  }

  try {
    const dto = await updateVerificationChecklist(id.trim(), { updates });
    if (!dto) {
      return jsonError("NOT_FOUND", "Canal não encontrado.", 404, { traceId });
    }
    return jsonSuccess(dto, { traceId });
  } catch (e) {
    console.error("[POST /api/admin/whatsapp/channels/:id/verification/checklist]", e);
    return jsonError("CHECKLIST_UPDATE_FAILED", "Não foi possível atualizar a checklist.", 500, { traceId });
  }
}
