/**
 * Visibilidade do excedente de IA faturado.
 * Conta eventos AI_OVERAGE_METER_SENT em BillingAuditLog e calcula custo.
 */

import { prisma } from "@/lib/prisma";
import { getUsageUnitPricesBrl } from "./planConfig";
import { periodBounds } from "@/modules/ai/aiUsageService";

const EVENT_TYPE_AI_OVERAGE = "AI_OVERAGE_METER_SENT";

export interface AiOverageVisibility {
  aiOverageBilled: number;
  aiOverageCostBrl: number;
}

/**
 * Conta respostas excedentes já faturadas (enviadas ao Stripe) no período.
 * Fonte: BillingAuditLog com eventType = AI_OVERAGE_METER_SENT.
 */
export async function getAiOverageBilledInPeriod(
  tenantId: string,
  period: string
): Promise<AiOverageVisibility> {
  const { gte, lte } = periodBounds(period);

  const count = await prisma.billingAuditLog.count({
    where: {
      tenantId,
      eventType: EVENT_TYPE_AI_OVERAGE,
      source: "usage",
      createdAt: { gte, lte },
    },
  });

  const prices = getUsageUnitPricesBrl();
  const costBrl = count * prices.aiResponse;

  return {
    aiOverageBilled: count,
    aiOverageCostBrl: Math.round(costBrl * 100) / 100,
  };
}
