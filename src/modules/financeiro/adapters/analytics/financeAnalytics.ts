import type { PrismaClient } from "@prisma/client";
import { createMarketingEvent } from "@/modules/financeiro/lib/marketing/service";

export type FinanceAnalyticsEvent =
  | "onboarding_completed"
  | "first_value"
  | { event: string; payload?: Record<string, unknown> };

/**
 * Adapter para eventos de analytics do fluxo financeiro.
 * Encapsula createMarketingEvent para uso por services/handlers.
 */
export async function trackFinanceEvent(
  prisma: PrismaClient,
  params: {
    leadId?: string | null;
    userId?: string | null;
    event: string;
    payload?: Record<string, unknown>;
  }
): Promise<void> {
  await createMarketingEvent(prisma, params);
}
