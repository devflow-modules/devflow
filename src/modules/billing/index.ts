/**
 * Portal: copy de planos e analytics de aquisição (/pricing). Operação Stripe no `apps/financeiro`.
 */
export {
  Plans,
  type PlanId,
  type PlanDefinition,
  type PlanFeatures,
  type FeatureName,
  type LimitType,
} from "./plans";
export {
  trackPlanViewed,
  trackUpgradeClicked,
  type BillingAnalyticsContext,
} from "./billingAnalytics";
