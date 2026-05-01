import type { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS, ROLES_OPERATIONAL } from "@/modules/auth";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { clearDealSuggestion, suggestInboxThreadDeal } from "./suggestDealService";
import { DEAL_LOST_REASONS } from "./dealTypes";

const suggestBodySchema = z
  .object({
    status: z.enum(["won", "lost"]),
    value: z.number().nonnegative().optional(),
    lostReason: z.enum(DEAL_LOST_REASONS).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "won" && (data.value === undefined || data.value <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Indique um valor maior que zero para sugerir ganho.",
        path: ["value"],
      });
    }
    if (data.status === "lost" && data.lostReason === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecione o motivo da perda.",
        path: ["lostReason"],
      });
    }
  });

export async function runSuggestDealPost(request: NextRequest, threadId: string): Promise<Response> {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_OPERATIONAL, request);
  if (denied) return denied;

  if (!threadId.trim()) {
    return jsonError("BAD_REQUEST", "id da conversa obrigatório", 400);
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return jsonError("BAD_REQUEST", "JSON inválido", 400);
  }

  const parsed = suggestBodySchema.safeParse(json);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const msg =
      flat.fieldErrors.value?.[0] ??
      flat.fieldErrors.lostReason?.[0] ??
      flat.fieldErrors.status?.[0] ??
      "Payload inválido";
    return jsonError("VALIDATION_ERROR", msg, 400);
  }

  const { status, value, lostReason } = parsed.data;

  const result = await suggestInboxThreadDeal({
    tenantId: auth!.payload.tenantId,
    threadId,
    userId: auth!.payload.sub,
    status,
    value,
    lostReason: status === "lost" ? lostReason : undefined,
  });

  if (!result.ok) {
    if (result.code === "NOT_FOUND") return jsonError("NOT_FOUND", "Conversa não encontrada", 404);
    if (result.code === "ALREADY_CLOSED") {
      return jsonError("CONFLICT", "Conversa já encerrada comercialmente.", 409);
    }
    if (result.code === "INVALID_LOST_REASON") {
      return jsonError("VALIDATION_ERROR", "Motivo de perda inválido.", 400);
    }
    return jsonError("VALIDATION_ERROR", "Valor inválido para sugestão de ganho.", 400);
  }

  return jsonSuccess({ suggested: true, status, value: status === "won" ? value : null, lostReason: status === "lost" ? lostReason : null });
}

export async function runClearDealSuggestionPost(request: NextRequest, threadId: string): Promise<Response> {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;

  if (!threadId.trim()) {
    return jsonError("BAD_REQUEST", "id da conversa obrigatório", 400);
  }

  const result = await clearDealSuggestion({
    tenantId: auth!.payload.tenantId,
    threadId,
    userId: auth!.payload.sub,
  });
  if (!result.ok) {
    return jsonError("NOT_FOUND", "Conversa não encontrada", 404);
  }
  return jsonSuccess({ cleared: true });
}
