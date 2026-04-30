import { NextRequest } from "next/server";
import { jsonError, jsonSuccess, newTraceId } from "@/lib/api-response";
import {
  setVerificationStatus,
  type VerificationAdminAction,
} from "@/modules/whatsapp/verificationService";
import { gatePlatformAdminOrProvisionSecret } from "@/lib/adminApiAuth";

export const dynamic = "force-dynamic";

const ACTIONS = new Set<VerificationAdminAction>(["mark_ready", "start", "approve", "reject"]);

function parseAction(body: unknown): { action: VerificationAdminAction; note?: string } | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const action = o.action;
  if (typeof action !== "string" || !ACTIONS.has(action as VerificationAdminAction)) return null;
  const note = o.note;
  return {
    action: action as VerificationAdminAction,
    note: typeof note === "string" ? note : undefined,
  };
}

/**
 * POST — altera estado operacional (`{ action: mark_ready|start|approve|reject, note? }`).
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const traceId = newTraceId();
  const gate = await gatePlatformAdminOrProvisionSecret(request);
  if (!gate.ok) return gate.response;

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

  const parsed = parseAction(body);
  if (!parsed) {
    return jsonError(
      "VALIDATION_ERROR",
      "Campo «action» inválido. Use: mark_ready, start, approve ou reject.",
      400,
      { traceId }
    );
  }

  try {
    const dto = await setVerificationStatus(id.trim(), parsed.action, { note: parsed.note });
    if (!dto) {
      return jsonError("NOT_FOUND", "Canal não encontrado.", 404, { traceId });
    }
    return jsonSuccess(dto, { traceId });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    const msg = err.message || "Transição inválida.";
    const isBiz = /Só é possível|Iniciar|Aprovar|Rejeitar|Checklist incompleta/i.test(msg);
    console.error("[POST /api/admin/whatsapp/channels/:id/verification/status]", e);
    return jsonError(isBiz ? "INVALID_TRANSITION" : "STATUS_UPDATE_FAILED", msg, isBiz ? 400 : 500, { traceId });
  }
}
