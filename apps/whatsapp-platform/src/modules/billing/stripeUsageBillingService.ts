/**
 * Stripe usage billing para excedente de IA.
 * Cobra Pro/Scale quando ultrapassam o limite do plano via meter events.
 *
 * Regras:
 * - Starter/FREE: não cobra excedente (fallback + upgrade)
 * - Pro/Scale: envia meter event ao Stripe quando used >= limit
 *
 * Idempotência: identifier por mensagem + BillingAuditLog evita duplicatas.
 */

import { prisma } from "@/lib/prisma";
import {
  createMeterEvent,
  METER_EVENT_AI_RESPONSES,
} from "./infrastructure/stripeMeterClient";
import { createBillingAuditLog } from "./infrastructure/billingAuditRepository";
import { getBillingSubscriptionByTenant } from "./infrastructure/billingRepository";
import type { PlanKey } from "./plans";

const EVENT_TYPE_AI_OVERAGE_SENT = "AI_OVERAGE_METER_SENT";

export type BillAiOverageInput = {
  tenantId: string;
  messageId: string;
  used: number;
  limit: number | null;
  plan: PlanKey;
};

/**
 * Cobra excedente de IA no Stripe quando aplicável.
 * - Starter/FREE: retorna sem fazer nada
 * - Pro/Scale + used >= limit: envia meter event (idempotente por messageId)
 *
 * Não bloqueia o fluxo: falhas são logadas e o cliente recebe a resposta normalmente.
 */
export async function billAiOverageIfApplicable(
  input: BillAiOverageInput
): Promise<void> {
  const { tenantId, messageId, used, limit, plan } = input;

  if (plan === "STARTER" || plan === "FREE") {
    return;
  }

  if (limit == null || used < limit) {
    return;
  }

  const billingSub = await getBillingSubscriptionByTenant(tenantId);
  const stripeCustomerId =
    billingSub?.stripeCustomerId ??
    (await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { stripeCustomerId: true },
    }))?.stripeCustomerId;

  if (!stripeCustomerId) {
    console.warn("[STRIPE_USAGE_BILLING] Sem stripeCustomerId, skip overage", {
      tenantId,
      messageId,
    });
    return;
  }

  const identifier = buildIdentifier(tenantId, messageId);

  const alreadyBilled = await prisma.billingAuditLog.findFirst({
    where: {
      referenceId: identifier,
      eventType: EVENT_TYPE_AI_OVERAGE_SENT,
    },
  });

  if (alreadyBilled) {
    return;
  }

  try {
    const result = await createMeterEvent({
      eventName: METER_EVENT_AI_RESPONSES,
      stripeCustomerId,
      value: 1,
      identifier,
    });

    if (!result.ok) {
      console.error("[STRIPE_USAGE_BILLING] Falha ao enviar meter event", {
        tenantId,
        messageId,
        error: result.error,
      });
      return;
    }

    await createBillingAuditLog({
      tenantId,
      eventType: EVENT_TYPE_AI_OVERAGE_SENT,
      source: "usage",
      referenceId: identifier,
      metadata: {
        messageId,
        used,
        limit,
        plan,
        billedAt: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.error("[STRIPE_USAGE_BILLING] Erro inesperado", {
      tenantId,
      messageId,
      err: e instanceof Error ? e.message : String(e),
    });
  }
}

/**
 * Fire-and-forget: não bloqueia a resposta ao cliente.
 */
export function billAiOverageIfApplicableAsync(
  input: BillAiOverageInput
): void {
  void billAiOverageIfApplicable(input).catch(() => {});
}

function buildIdentifier(tenantId: string, messageId: string): string {
  const raw = `ai_overage_${tenantId}_${messageId}`;
  return raw.length > 100 ? raw.slice(0, 100) : raw;
}
