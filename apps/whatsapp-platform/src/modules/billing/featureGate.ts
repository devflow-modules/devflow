/**
 * Feature gating — controle de features por plano.
 * Backend-first: sempre validar no servidor.
 */

import { getPlan, normalizePlan } from "./plans";
import { getTenantPlan } from "./subscriptionService";
import {
  FeatureNotAvailableError,
  buildFeatureAccessError,
  featureAccessDeniedResponse,
  minimumPlanForFeature,
} from "./featureAccess";
import type { NextResponse } from "next/server";

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
    const currentPlan = normalizePlan(await getTenantPlan(tenantId));
    const requiredPlan = minimumPlanForFeature(feature);
    const payload = buildFeatureAccessError({ feature, currentPlan, requiredPlan });
    throw new FeatureNotAvailableError(
      payload.message,
      feature,
      currentPlan,
      requiredPlan
    );
  }
}

/**
 * Retorna `NextResponse` 403 se a feature não estiver disponível; caso contrário `null`.
 */
export async function requireFeatureOr403(
  tenantId: string,
  feature: FeatureKey
): Promise<NextResponse | null> {
  if (await canUseFeature(tenantId, feature)) return null;
  return featureAccessDeniedResponse(tenantId, feature);
}
