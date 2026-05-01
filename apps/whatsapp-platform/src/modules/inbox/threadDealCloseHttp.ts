import type { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { closeInboxThreadDeal } from "./threadDealService";
import { DEAL_LOST_REASONS } from "./dealTypes";

const bodySchema = z
  .object({
    status: z.enum(["won", "lost"]),
    value: z.number().nonnegative().optional(),
    currency: z.string().trim().max(8).optional().default("BRL"),
    lostReason: z.enum(DEAL_LOST_REASONS).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "won" && (data.value === undefined || data.value <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Indique um valor maior que zero para venda ganha.",
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

export async function runCloseDealPost(request: NextRequest, threadId: string): Promise<Response> {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
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

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const msg =
      flat.fieldErrors.value?.[0] ??
      flat.fieldErrors.lostReason?.[0] ??
      flat.fieldErrors.status?.[0] ??
      "Payload inválido";
    return jsonError("VALIDATION_ERROR", msg, 400);
  }

  const { status, value, currency, lostReason } = parsed.data;

  try {
    const result = await closeInboxThreadDeal({
      tenantId: auth!.payload.tenantId,
      threadId,
      userId: auth!.payload.sub,
      status,
      value,
      currency,
      lostReason: status === "lost" ? lostReason : undefined,
    });
    if (!result.ok) {
      if (result.code === "NOT_FOUND") {
        return jsonError("NOT_FOUND", "Conversa não encontrada", 404);
      }
      if (result.code === "INVALID_VALUE") {
        return jsonError("VALIDATION_ERROR", "Valor inválido para venda ganha.", 400);
      }
      if (result.code === "INVALID_LOST_REASON") {
        return jsonError("VALIDATION_ERROR", "Motivo de perda inválido.", 400);
      }
      return jsonError("CONFLICT", "Esta conversa já tem fecho de venda registado.", 409);
    }
  } catch (e) {
    console.error("[close-deal]", e);
    return jsonError("INTERNAL", "Erro ao registar fecho.", 500);
  }

  return jsonSuccess({
    status,
    value: status === "won" ? value : null,
    currency: currency.trim().toUpperCase().slice(0, 8) || "BRL",
    lostReason: status === "lost" ? lostReason : null,
  });
}
