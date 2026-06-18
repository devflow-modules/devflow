import { careerBundleSchema } from "../schemas/careerBundle.js";
import {
  isCareerAgentContextSafe,
  scanCareerAgentPayloadForForbiddenKeys,
  scanCareerAnalysisInputForForbiddenKeys,
} from "./security.js";
import type { CareerAgentContext, CareerAgentPolicyBlockCode, CareerAgentRequest } from "./types.js";

export type CareerAgentPolicyEvaluation = {
  allowed: boolean;
  code?: CareerAgentPolicyBlockCode;
  message?: string;
};

export const CAREER_AGENT_POLICY: {
  explicitConsentRequired: true;
  requireSanitizedBundle: true;
  forbidRawProviderData: true;
  forbidProviderTokens: true;
  requireKnownSelectedSignals: true;
  allowlistCapabilitiesOnly: true;
} = {
  explicitConsentRequired: true,
  requireSanitizedBundle: true,
  forbidRawProviderData: true,
  forbidProviderTokens: true,
  requireKnownSelectedSignals: true,
  allowlistCapabilitiesOnly: true,
};

function hasApplications(bundle: CareerAgentRequest["context"]["careerBundle"]): boolean {
  return bundle.applications.length > 0;
}

export function evaluateCareerAgentPolicy(
  request: CareerAgentRequest,
  context: CareerAgentContext,
): CareerAgentPolicyEvaluation {
  if (request.explicitConsent !== true) {
    return {
      allowed: false,
      code: "explicit_consent_required",
      message: "Explicit consent is required before agent orchestration.",
    };
  }

  const bundleParse = careerBundleSchema.safeParse(request.context.careerBundle);
  if (!bundleParse.success || !hasApplications(bundleParse.data)) {
    return {
      allowed: false,
      code: "missing_required_input",
      message: "A sanitized CareerBundle with at least one application is required.",
    };
  }

  if (!isCareerAgentContextSafe(request.context)) {
    return {
      allowed: false,
      code: "unsafe_context",
      message: "Request context contains unsafe fields.",
    };
  }

  if (scanCareerAgentPayloadForForbiddenKeys(request.context).length > 0) {
    return {
      allowed: false,
      code: "unsafe_context",
      message: "Request context contains forbidden provider or secret fields.",
    };
  }

  if (
    request.context.analysisInput &&
    scanCareerAnalysisInputForForbiddenKeys(request.context.analysisInput).length > 0
  ) {
    return {
      allowed: false,
      code: "unsafe_context",
      message: "Analysis input contains forbidden control or secret fields.",
    };
  }

  if (context.rawProviderData !== false) {
    return {
      allowed: false,
      code: "raw_provider_data_not_allowed",
      message: "Raw provider data is not allowed in agent context.",
    };
  }

  if (context.hasToken !== false) {
    return {
      allowed: false,
      code: "provider_token_not_allowed",
      message: "Provider tokens are not allowed in agent context.",
    };
  }

  const availableIds = new Set((request.context.availableSignals ?? []).map((signal) => signal.id));
  const unknownSelectedId = request.context.selectedSignalIds.find((id) => !availableIds.has(id));

  if (request.context.selectedSignalIds.length > 0 && unknownSelectedId) {
    return {
      allowed: false,
      code: "missing_required_input",
      message: "Selected signal ids must exist in the available signal context.",
    };
  }

  return { allowed: true };
}
