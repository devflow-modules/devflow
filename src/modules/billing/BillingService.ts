/**
 * Serviço de billing: plano do usuário, limites e features.
 * Usa BillingRepository para persistência (tabela UserPlan).
 */

import { Plans, type PlanId, type FeatureName, type LimitType } from "./plans";
import * as BillingRepository from "./BillingRepository";

export async function getUserPlan(userId: string): Promise<PlanId> {
  return BillingRepository.getUserPlan(userId);
}

export async function setUserPlan(userId: string, planId: PlanId): Promise<void> {
  await BillingRepository.setUserPlan(userId, planId);
}

export async function resetUserPlan(userId: string): Promise<void> {
  await BillingRepository.setUserPlan(userId, "FREE");
}

export async function checkFeature(userId: string, featureName: FeatureName): Promise<boolean> {
  const planId = await getUserPlan(userId);
  const plan = Plans[planId];
  return plan.features[featureName] === true;
}

export async function checkLimit(
  userId: string,
  limitType: LimitType,
  currentCount: number
): Promise<boolean> {
  const planId = await getUserPlan(userId);
  const plan = Plans[planId];
  const max = limitType === "households" ? plan.maxHouseholds : plan.maxRules;
  return currentCount < max;
}

export async function getLimit(userId: string, limitType: LimitType): Promise<number> {
  const planId = await getUserPlan(userId);
  const plan = Plans[planId];
  return limitType === "households" ? plan.maxHouseholds : plan.maxRules;
}

export const BillingService = {
  getUserPlan,
  setUserPlan,
  resetUserPlan,
  checkFeature,
  checkLimit,
  getLimit,
};
