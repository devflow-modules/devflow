import { prisma } from "@/lib/prisma";
import { logAction } from "./auditService";
import { isDealLostReason, type DealLostReason } from "./dealTypes";
import type { CloseDealStatus } from "./threadDealService";

export type SuggestInboxThreadDealResult =
  | { ok: true }
  | { ok: false; code: "NOT_FOUND" | "ALREADY_CLOSED" | "INVALID_VALUE" | "INVALID_LOST_REASON" };

/**
 * Operador (ou manager) regista proposta de fecho — não altera `dealStatus` nem receita.
 */
export async function suggestInboxThreadDeal(params: {
  tenantId: string;
  threadId: string;
  userId: string;
  status: CloseDealStatus;
  value?: number;
  lostReason?: string | null;
}): Promise<SuggestInboxThreadDealResult> {
  const { tenantId, threadId, userId, status } = params;
  const existing = await prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId },
    select: { dealStatus: true },
  });
  if (!existing) return { ok: false, code: "NOT_FOUND" };
  if (existing.dealStatus === "won" || existing.dealStatus === "lost") {
    return { ok: false, code: "ALREADY_CLOSED" };
  }

  if (status === "lost") {
    const lr = params.lostReason?.trim() ?? "";
    if (!isDealLostReason(lr)) return { ok: false, code: "INVALID_LOST_REASON" };
    const now = new Date();
    await prisma.waInboxThread.update({
      where: { id: threadId, tenantId },
      data: {
        dealSuggested: true,
        dealSuggestedAt: now,
        dealSuggestedBy: userId,
        dealSuggestedStatus: "lost",
        dealSuggestedValue: null,
        dealSuggestedLostReason: lr as DealLostReason,
      },
    });
    await logAction(tenantId, threadId, userId, "deal_suggest", {
      status: "lost",
      lostReason: lr,
    });
    return { ok: true };
  }

  const v = params.value;
  if (v === undefined || Number.isNaN(v) || v <= 0) {
    return { ok: false, code: "INVALID_VALUE" };
  }
  const now = new Date();
  await prisma.waInboxThread.update({
    where: { id: threadId, tenantId },
    data: {
      dealSuggested: true,
      dealSuggestedAt: now,
      dealSuggestedBy: userId,
      dealSuggestedStatus: "won",
      dealSuggestedValue: v,
      dealSuggestedLostReason: null,
    },
  });
  await logAction(tenantId, threadId, userId, "deal_suggest", {
    status: "won",
    value: v,
  });
  return { ok: true };
}

export type ClearDealSuggestionResult = { ok: true } | { ok: false; code: "NOT_FOUND" };

/** Manager ignora proposta — remove marcação sem fechar negócio. */
export async function clearDealSuggestion(params: {
  tenantId: string;
  threadId: string;
  userId: string;
}): Promise<ClearDealSuggestionResult> {
  const { tenantId, threadId, userId } = params;
  const row = await prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId },
    select: { id: true },
  });
  if (!row) return { ok: false, code: "NOT_FOUND" };

  await prisma.waInboxThread.update({
    where: { id: threadId, tenantId },
    data: {
      dealSuggested: false,
      dealSuggestedAt: null,
      dealSuggestedBy: null,
      dealSuggestedStatus: null,
      dealSuggestedValue: null,
      dealSuggestedLostReason: null,
    },
  });
  await logAction(tenantId, threadId, userId, "deal_suggestion_clear", {});
  return { ok: true };
}
