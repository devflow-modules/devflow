import type { PlanId } from "./plans";
import * as BillingRepository from "./BillingRepository";

export function planCodeAndStatusToUserPlan(planCode: string, status: string): PlanId {
  if (status !== "active" && status !== "trialing") return "FREE";
  if (planCode === "pro") return "PRO";
  if (planCode === "team") return "TEAM";
  return "FREE";
}

export async function syncUserPlanFromTenant(tenantId: string, planCode: string, status: string): Promise<void> {
  await BillingRepository.setUserPlan(tenantId, planCodeAndStatusToUserPlan(planCode, status));
}
