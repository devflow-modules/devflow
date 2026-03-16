/**
 * Serviço de faturamento — planos, cotas e Stripe Customer Portal.
 */

import { findUserById } from "@/modules/users";
import { createCustomerPortalSession } from "@devflow/billing-core";
import type { PlanSlug } from "@/lib/db/types";

export interface BillingStatus {
  plan: PlanSlug;
  remaining_queries: number;
  canUsePortal: boolean;
}

const QUERIES_BY_PLAN: Record<PlanSlug, number> = {
  free: 10,
  standard: 50,
  pro: 200,
};

export async function getBillingStatus(userId: string): Promise<BillingStatus | null> {
  const user = await findUserById(userId);
  if (!user) return null;
  return {
    plan: user.plan ?? "free",
    remaining_queries: user.remaining_queries ?? 10,
    canUsePortal: !!user.stripe_customer_id,
  };
}

export function getQueriesLimitForPlan(plan: PlanSlug): number {
  return QUERIES_BY_PLAN[plan] ?? 10;
}

export async function createPortalSession(
  userId: string,
  returnUrl: string
): Promise<{ portalUrl: string } | { error: string }> {
  const user = await findUserById(userId);
  if (!user?.stripe_customer_id) {
    return { error: "Cliente não possui assinatura vinculada." };
  }
  try {
    const { portalUrl } = await createCustomerPortalSession({
      stripeCustomerId: user.stripe_customer_id,
      returnUrl,
    });
    return { portalUrl };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao abrir portal";
    return { error: message };
  }
}
