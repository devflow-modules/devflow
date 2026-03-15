/**
 * Mapeamento evento do funil → função de track e métrica.
 * Usado pela API de track e pela ponte finance → devflow.
 */

import type { DevflowFunnelEventName } from "@/analytics/devflowFunnelEvents";
import { DEVFLOW_FUNNEL_EVENTS } from "@/analytics/devflowFunnelEvents";
import type { GrowthAnalyticsContext } from "./growthAnalytics";
import {
  trackVisitor,
  trackSimulatorUsage,
  trackLeadSubmission,
  trackSignupStarted,
  trackSignupCompleted,
  trackHouseholdCreated,
  trackFirstExpenseCreated,
  trackFirstIncomeCreated,
  trackFirstRuleCreated,
} from "./growthAnalytics";

const HANDLERS: Record<
  DevflowFunnelEventName,
  (ctx: GrowthAnalyticsContext) => void
> = {
  [DEVFLOW_FUNNEL_EVENTS.VISITOR_LANDED]: trackVisitor,
  [DEVFLOW_FUNNEL_EVENTS.SIMULATOR_USED]: trackSimulatorUsage,
  [DEVFLOW_FUNNEL_EVENTS.LEAD_SUBMITTED]: trackLeadSubmission,
  [DEVFLOW_FUNNEL_EVENTS.SIGNUP_STARTED]: trackSignupStarted,
  [DEVFLOW_FUNNEL_EVENTS.SIGNUP_COMPLETED]: trackSignupCompleted,
  [DEVFLOW_FUNNEL_EVENTS.HOUSEHOLD_CREATED]: trackHouseholdCreated,
  [DEVFLOW_FUNNEL_EVENTS.FIRST_EXPENSE_CREATED]: trackFirstExpenseCreated,
  [DEVFLOW_FUNNEL_EVENTS.FIRST_INCOME_CREATED]: trackFirstIncomeCreated,
  [DEVFLOW_FUNNEL_EVENTS.FIRST_RULE_CREATED]: trackFirstRuleCreated,
};

export function trackFunnelEvent(
  eventName: DevflowFunnelEventName,
  context: GrowthAnalyticsContext
): void {
  const handler = HANDLERS[eventName];
  if (handler) {
    handler(context);
  }
}

export { DEVFLOW_FUNNEL_EVENTS } from "@/analytics/devflowFunnelEvents";
export type { DevflowFunnelEventName } from "@/analytics/devflowFunnelEvents";
