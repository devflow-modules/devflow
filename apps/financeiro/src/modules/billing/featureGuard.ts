/**
 * Guard de features: TenantSubscription + featureGate quando existir linha;
 * senão fallback em UserPlan (BillingService).
 */

import type { FeatureName } from "./plans";
import { BillingService } from "./BillingService";
import { hasAccess, type BillableFeature } from "./featureGate";
import { findByTenantId } from "./tenantSubscriptionService";

export type FeatureGuardError = {
  error: "feature_not_available";
  planRequired: string;
};

const FEATURE_TO_PLAN: Record<FeatureName, string> = {
  advancedRules: "PRO",
  exports: "PRO",
  analytics: "PRO",
};

const FEATURE_TO_BILLABLE: Record<FeatureName, BillableFeature> = {
  advancedRules: "advanced_reports",
  exports: "exports",
  analytics: "advanced_reports",
};

export async function requireFeature(
  userId: string,
  featureName: FeatureName
): Promise<FeatureGuardError | null> {
  const sub = await findByTenantId(userId);
  if (sub) {
    const ok = hasAccess(sub, FEATURE_TO_BILLABLE[featureName]);
    if (ok) return null;
    return {
      error: "feature_not_available",
      planRequired: FEATURE_TO_PLAN[featureName] ?? "PRO",
    };
  }

  const legacyOk = await BillingService.checkFeature(userId, featureName);
  if (legacyOk) return null;
  return {
    error: "feature_not_available",
    planRequired: FEATURE_TO_PLAN[featureName] ?? "PRO",
  };
}
