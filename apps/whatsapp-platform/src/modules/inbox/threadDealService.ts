import { prisma } from "@/lib/prisma";
import { logAction } from "./auditService";
import { isDealLostReason } from "./dealTypes";

export type CloseDealStatus = "won" | "lost";

export type CloseInboxThreadDealResult =
  | { ok: true }
  | { ok: false; code: "NOT_FOUND" | "ALREADY_CLOSED" | "INVALID_VALUE" | "INVALID_LOST_REASON" };

const clearSuggestionData = {
  dealSuggested: false,
  dealSuggestedAt: null,
  dealSuggestedBy: null,
  dealSuggestedStatus: null,
  dealSuggestedValue: null,
  dealSuggestedLostReason: null,
} as const;

/**
 * Fecho confirmado (manager / platform_admin na rota HTTP).
 * Limpa sempre campos de sugestão após fecho bem-sucedido.
 * `lost` exige `lostReason` válido (enum MVP).
 */
export async function closeInboxThreadDeal(params: {
  tenantId: string;
  threadId: string;
  userId: string;
  status: CloseDealStatus;
  value: number | undefined;
  currency: string;
  lostReason?: string | null;
}): Promise<CloseInboxThreadDealResult> {
  const { tenantId, threadId, userId, status, currency } = params;
  const existing = await prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId },
    select: { dealStatus: true },
  });
  if (!existing) return { ok: false, code: "NOT_FOUND" };
  if (existing.dealStatus === "won" || existing.dealStatus === "lost") {
    return { ok: false, code: "ALREADY_CLOSED" };
  }

  const now = new Date();
  const cur = currency.trim().toUpperCase().slice(0, 8) || "BRL";

  if (status === "won") {
    const v = params.value;
    if (v === undefined || Number.isNaN(v) || v <= 0) {
      return { ok: false, code: "INVALID_VALUE" };
    }
    await prisma.waInboxThread.update({
      where: { id: threadId, tenantId },
      data: {
        dealStatus: "won",
        dealValue: v,
        dealCurrency: cur,
        dealClosedAt: now,
        dealLostReason: null,
        ...clearSuggestionData,
      },
    });
    await logAction(tenantId, threadId, userId, "deal_close", {
      status: "won",
      value: v,
      currency: cur,
    });
    return { ok: true };
  }

  const lr = params.lostReason?.trim() ?? "";
  if (!isDealLostReason(lr)) {
    return { ok: false, code: "INVALID_LOST_REASON" };
  }

  await prisma.waInboxThread.update({
    where: { id: threadId, tenantId },
    data: {
      dealStatus: "lost",
      dealValue: null,
      dealCurrency: cur,
      dealClosedAt: now,
      dealLostReason: lr,
      ...clearSuggestionData,
    },
  });
  await logAction(tenantId, threadId, userId, "deal_close", {
    status: "lost",
    value: null,
    currency: cur,
    lostReason: lr,
  });
  return { ok: true };
}
