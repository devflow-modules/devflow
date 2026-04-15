/**
 * Respostas padronizadas para feature gating (403 FEATURE_NOT_AVAILABLE).
 * `plans.ts` é a fonte de verdade para `minimumPlanForFeature`.
 */

import { NextResponse } from "next/server";
import type { FeatureKey } from "./featureGate";
import { PLANS, normalizePlan, type PlanFeatures, type PlanKey } from "./plans";
import { getTenantPlan } from "./subscriptionService";
import { bumpMetric, logEvent } from "@/lib/observability";
import { featureUpgradeShortMessage } from "./featureUpgradeCopy";

const PLAN_ORDER: PlanKey[] = ["FREE", "STARTER", "PRO", "SCALE"];

const FEATURE_TO_PLAN_KEY: Record<FeatureKey, keyof PlanFeatures> = {
  AUTOMATION: "AUTOMATION",
  PLAYBOOKS: "ADVANCED_AUTOMATION",
  QUEUES_TAGS: "QUEUES_TAGS",
  ADVANCED_AUTOMATION: "ADVANCED_AUTOMATION",
  AI_RESPONSE: "AI_RESPONSE",
  ADVANCED_AI: "ADVANCED_AI",
  WEBHOOKS_API: "WEBHOOKS_API",
  ADVANCED_REPORTS: "ADVANCED_REPORTS",
  MULTI_USER: "MULTI_USER",
  PRIORITY_SUPPORT: "PRIORITY_SUPPORT",
};

export type FeatureNotAvailablePayload = {
  success: false;
  code: "FEATURE_NOT_AVAILABLE";
  feature: FeatureKey;
  currentPlan: PlanKey;
  requiredPlan: PlanKey;
  message: string;
};

/**
 * Plano mínimo em que a feature está incluída (itera PLAN_ORDER sobre flags em `plans.ts`).
 */
export function minimumPlanForFeature(feature: FeatureKey): PlanKey {
  const key = FEATURE_TO_PLAN_KEY[feature];
  for (const pk of PLAN_ORDER) {
    if (PLANS[pk].features[key]) return pk;
  }
  return "SCALE";
}

export function buildFeatureAccessError(params: {
  feature: FeatureKey;
  currentPlan: PlanKey;
  requiredPlan?: PlanKey;
}): FeatureNotAvailablePayload {
  const requiredPlan = params.requiredPlan ?? minimumPlanForFeature(params.feature);
  const message = featureUpgradeShortMessage(params.feature, requiredPlan);
  return {
    success: false,
    code: "FEATURE_NOT_AVAILABLE",
    feature: params.feature,
    currentPlan: params.currentPlan,
    requiredPlan,
    message,
  };
}

export class FeatureNotAvailableError extends Error {
  readonly code = "FEATURE_NOT_AVAILABLE" as const;

  constructor(
    message: string,
    public readonly feature: FeatureKey,
    public readonly currentPlan: PlanKey,
    public readonly requiredPlan: PlanKey
  ) {
    super(message);
    this.name = "FeatureNotAvailableError";
    Object.setPrototypeOf(this, FeatureNotAvailableError.prototype);
  }

  toJSON(): FeatureNotAvailablePayload {
    return buildFeatureAccessError({
      feature: this.feature,
      currentPlan: this.currentPlan,
      requiredPlan: this.requiredPlan,
    });
  }
}

export async function featureAccessDeniedResponse(
  tenantId: string,
  feature: FeatureKey
): Promise<NextResponse> {
  const raw = await getTenantPlan(tenantId);
  const currentPlan = normalizePlan(raw);
  const body = buildFeatureAccessError({ feature, currentPlan });
  bumpMetric("feature_gate_blocked");
  logEvent(
    "info",
    "billing",
    "feature_access_denied",
    {
      feature,
      currentPlan: body.currentPlan,
      requiredPlan: body.requiredPlan,
    },
    { tenant_id: tenantId }
  );
  return NextResponse.json(body, { status: 403 });
}
