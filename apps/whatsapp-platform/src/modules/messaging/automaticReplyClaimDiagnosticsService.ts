/**
 * Listagem e diagnóstico de claims (sem claimToken).
 */

import type { PrismaClient } from "@/generated/prisma-whatsapp";
import type {
  WaAutoReplyClaimStatus,
  WaAutoReplyClaimTrigger,
} from "@/generated/prisma-whatsapp";
import { WA_AUTO_REPLY_CLAIM_PUBLIC_SELECT } from "./automaticReplyClaimReconciliationService";

export interface ListWaAutoReplyClaimsParams {
  tenantId: string;
  threadId?: string;
  inboundWaMessageId?: string;
  triggerSource?: WaAutoReplyClaimTrigger;
  status?: WaAutoReplyClaimStatus;
  createdFrom?: Date;
  createdTo?: Date;
  skip: number;
  take: number;
}

export async function listWaAutoReplyClaimsForAdmin(
  prisma: PrismaClient,
  params: ListWaAutoReplyClaimsParams
) {
  const where = {
    tenantId: params.tenantId,
    ...(params.threadId ? { waInboxThreadId: params.threadId } : {}),
    ...(params.inboundWaMessageId
      ? { inboundWaMessageId: params.inboundWaMessageId }
      : {}),
    ...(params.triggerSource ? { triggerSource: params.triggerSource } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...((params.createdFrom || params.createdTo) && {
      createdAt: {
        ...(params.createdFrom ? { gte: params.createdFrom } : {}),
        ...(params.createdTo ? { lte: params.createdTo } : {}),
      },
    }),
  };

  const [items, total] = await Promise.all([
    prisma.waAutoReplyClaim.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
      select: WA_AUTO_REPLY_CLAIM_PUBLIC_SELECT,
    }),
    prisma.waAutoReplyClaim.count({ where }),
  ]);

  return { items, total };
}
