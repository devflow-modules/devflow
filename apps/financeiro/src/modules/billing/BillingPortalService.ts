/**
 * Serviço de self-service de assinatura.
 * Encapsula a lógica de consultar o perfil de billing e abrir o Customer Portal.
 * Mantém a rota e a página livres de lógica de negócio.
 */

import type { PlanId } from "./plans";
import * as BillingRepository from "./BillingRepository";
import * as BillingProfileRepository from "./BillingProfileRepository";
import { createCustomerPortalSession } from "@devflow/billing-core";

export type SubscriptionSummary = {
  planId: PlanId;
  hasBillingProfile: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  canManageBilling: boolean;
};

export async function getCurrentSubscriptionSummary(userId: string): Promise<SubscriptionSummary> {
  const [planId, profile] = await Promise.all([
    BillingRepository.getUserPlan(userId),
    BillingProfileRepository.getByUserId(userId),
  ]);

  const hasBillingProfile = profile !== null && profile.stripeCustomerId !== null;

  return {
    planId,
    hasBillingProfile,
    stripeCustomerId: profile?.stripeCustomerId ?? null,
    stripeSubscriptionId: profile?.stripeSubscriptionId ?? null,
    canManageBilling: hasBillingProfile,
  };
}

export type OpenPortalResult =
  | { ok: true; portalUrl: string }
  | { ok: false; error: "BILLING_PROFILE_NOT_FOUND" | "STRIPE_CUSTOMER_NOT_FOUND" | "INTERNAL_ERROR" };

export async function openCustomerPortal(
  userId: string,
  returnUrl: string
): Promise<OpenPortalResult> {
  const profile = await BillingProfileRepository.getByUserId(userId);

  if (!profile) {
    return { ok: false, error: "BILLING_PROFILE_NOT_FOUND" };
  }

  if (!profile.stripeCustomerId) {
    return { ok: false, error: "STRIPE_CUSTOMER_NOT_FOUND" };
  }

  try {
    const { portalUrl } = await createCustomerPortalSession({
      stripeCustomerId: profile.stripeCustomerId,
      returnUrl,
    });
    return { ok: true, portalUrl };
  } catch (err) {
    console.error("[BillingPortalService] openCustomerPortal error", err);
    return { ok: false, error: "INTERNAL_ERROR" };
  }
}
