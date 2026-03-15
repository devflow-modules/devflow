/**
 * Serviço de billing: plano do usuário, limites e features.
 * Inicialmente todos os usuários são FREE; preparado para persistência futura.
 */

import { Plans, type PlanId, type FeatureName, type LimitType } from "./plans";

/** Em memória: userId -> planId. Futuro: buscar de assinatura/DB. */
const userPlans = new Map<string, PlanId>();

function getUserPlan(userId: string): PlanId {
  return userPlans.get(userId) ?? "FREE";
}

function setUserPlan(userId: string, planId: PlanId): void {
  userPlans.set(userId, planId);
}

function resetUserPlan(userId: string): void {
  userPlans.delete(userId);
}

function checkFeature(userId: string, featureName: FeatureName): boolean {
  const planId = getUserPlan(userId);
  const plan = Plans[planId];
  return plan.features[featureName] === true;
}

function checkLimit(
  userId: string,
  limitType: LimitType,
  currentCount: number
): boolean {
  const planId = getUserPlan(userId);
  const plan = Plans[planId];
  const max = limitType === "households" ? plan.maxHouseholds : plan.maxRules;
  return currentCount < max;
}

function getLimit(userId: string, limitType: LimitType): number {
  const planId = getUserPlan(userId);
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
