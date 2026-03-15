/**
 * Guard de features: retorna erro padronizado quando usuário não tem acesso.
 * Uso em rotas: if (!checkFeature(...)) return requireFeature("analytics")
 */

import type { FeatureName } from "./plans";
import { BillingService } from "./BillingService";

export type FeatureGuardError = {
  error: "feature_not_available";
  planRequired: string;
};

const FEATURE_TO_PLAN: Record<FeatureName, string> = {
  advancedRules: "PRO",
  exports: "PRO",
  analytics: "PRO",
};

export async function requireFeature(
  userId: string,
  featureName: FeatureName
): Promise<FeatureGuardError | null> {
  const hasAccess = await BillingService.checkFeature(userId, featureName);
  if (hasAccess) return null;
  return {
    error: "feature_not_available",
    planRequired: FEATURE_TO_PLAN[featureName] ?? "PRO",
  };
}
