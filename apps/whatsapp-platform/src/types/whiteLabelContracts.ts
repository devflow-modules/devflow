/**
 * Contratos de resposta seguros em modo WHITE_LABEL (referência para clientes e testes).
 * A fonte de verdade das transformações é `modules/billing/billingSanitizer.ts` e as rotas de API.
 */

export type {
  SanitizedSubscriptionView,
  SanitizedUsageDashboard,
  SanitizedTenantBillingUI,
  SanitizedAiUsageStatusPayload,
  SanitizedAiUsageRouteMetrics,
  SanitizedUsageLimitErrorPayload,
  SanitizedFeatureNotAvailablePayload,
  AiUsageRouteMetrics,
  AiUsageStatusClientPayload,
  AiPlanClientPayload,
  UsageLimitErrorPayload,
  FeatureNotAvailablePayloadShape,
} from "@/modules/billing/billingSanitizer";

/** `POST /api/auth/signup` quando `NEXT_PUBLIC_PRODUCT_MODE=WHITE_LABEL` (sem checkout Stripe). */
export type SignupWhiteLabelSuccessBody = {
  success: true;
  message: string;
  redirectTo: "/onboarding";
  requiresManualActivation: true;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
  };
};
