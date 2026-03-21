/**
 * Feature gating — controle de features por plano.
 * Backend-first: sempre validar no servidor.
 */

import { getPlan } from "./plans";
import { getTenantPlan } from "./subscriptionService";

export type FeatureKey =
  | "AUTOMATION"
  | "PLAYBOOKS" /** @deprecated use ADVANCED_AUTOMATION */
  | "QUEUES_TAGS"
  | "ADVANCED_AUTOMATION"
  | "AI_RESPONSE"
  | "ADVANCED_AI"
  | "WEBHOOKS_API"
  | "ADVANCED_REPORTS"
  | "MULTI_USER"
  | "PRIORITY_SUPPORT";

const FEATURE_ALIASES: Partial<Record<FeatureKey, keyof import("./plans").PlanFeatures>> = {
  PLAYBOOKS: "ADVANCED_AUTOMATION",
};

/**
 * Verifica se o tenant pode usar a feature.
 * Retorna true apenas se o plano inclui a feature.
 */
export async function canUseFeature(
  tenantId: string,
  feature: FeatureKey
): Promise<boolean> {
  const plan = await getTenantPlan(tenantId);
  const features = getPlan(plan).features;
  const resolved = FEATURE_ALIASES[feature] ?? feature;
  return (features as Record<string, boolean>)[resolved] === true;
}

/**
 * Lança erro se o tenant não pode usar a feature.
 * Use antes de executar operações restritas.
 */
export async function assertFeature(
  tenantId: string,
  feature: FeatureKey
): Promise<void> {
  const allowed = await canUseFeature(tenantId, feature);
  if (!allowed) {
    const err = new Error("Upgrade your plan") as Error & { code?: string };
    err.code = "FEATURE_BLOCKED";
    throw err;
  }
}
