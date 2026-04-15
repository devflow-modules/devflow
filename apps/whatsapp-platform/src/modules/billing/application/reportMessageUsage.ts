/**
 * Reports message usage. Uses included quota first; only overage is sent to Stripe meter events.
 */

import { prisma } from "@/lib/prisma";
import { getBillingSubscriptionByTenant } from "../infrastructure/billingRepository";
import { createMeterEvent, METER_EVENT_MESSAGES, isMeterEventsConfigured } from "../infrastructure/stripeMeterClient";
import { allocateUsage, getMessageLimits } from "../domain/usagePolicy";
import { planAllowsMeteredOverage } from "../plans";
import { logOverageSent, logSystemError } from "../billingObserverService";

const ACTIVE_STATUSES = ["active", "trialing"];

export type ReportMessageUsageResult =
  | { ok: true }
  | { ok: false; error: string };

export async function reportMessageUsage(params: {
  tenantId: string;
  quantity: number;
  timestamp?: number;
  /** Idempotência: mesmo valor = mesmo efeito em retry (recomendado: UsageEvent.id) */
  idempotencyKey?: string;
}): Promise<ReportMessageUsageResult> {
  const qty = Math.max(1, params.quantity);
  const ts = params.timestamp ?? Math.floor(Date.now() / 1000);

  const sub = await getBillingSubscriptionByTenant(params.tenantId);
  if (!sub) {
    return { ok: true };
  }
  if (!ACTIVE_STATUSES.includes(sub.status)) {
    return { ok: false, error: `subscription_status_${sub.status}` };
  }
  if (!sub.stripeCustomerId) {
    return { ok: false, error: "no_stripe_customer" };
  }

  const limit = getMessageLimits(sub.plan);
  const { included, overage } = allocateUsage(
    qty,
    limit,
    sub.messagesIncludedUsed
  );

  const newIncludedUsed = sub.messagesIncludedUsed + included;
  const newOverageSent = sub.messagesOverageSent + overage;

  await prisma.$transaction(async (tx) => {
    await tx.billingSubscription.updateMany({
      where: { tenantId: params.tenantId },
      data: {
        messagesIncludedUsed: newIncludedUsed,
        messagesOverageSent: newOverageSent,
      },
    });
  });

  const isPaidPlan = planAllowsMeteredOverage(sub.plan);
  if (overage > 0 && isMeterEventsConfigured() && isPaidPlan) {
    logOverageSent(params.tenantId, "messages", overage);
    const result = await createMeterEvent({
      eventName: METER_EVENT_MESSAGES,
      stripeCustomerId: sub.stripeCustomerId,
      value: overage,
      timestamp: ts,
      identifier: params.idempotencyKey ?? `msg_${params.tenantId}_${Date.now()}`,
    });
    if (!result.ok) {
      logSystemError({
        tenantId: params.tenantId,
        context: "reportMessageUsage.meter",
        error: new Error(result.error),
        metadata: { overage },
      });
      return { ok: false, error: result.error };
    }
  }

  return { ok: true };
}
