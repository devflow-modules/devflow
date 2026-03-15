/**
 * Growth Analytics — funil de aquisição e ativação DevFlow.
 * Cada função loga, registra métrica e pode ser estendida para emitir evento (ex.: PostHog).
 */

import { increment } from "./growthMetrics";
import { DEVFLOW_FUNNEL_EVENTS } from "@/analytics/devflowFunnelEvents";

export type GrowthAnalyticsContext = {
  sessionId?: string;
  userId?: string;
  householdId?: string;
  timestamp?: string;
  source?: string;
};

function withTimestamp(ctx: GrowthAnalyticsContext): GrowthAnalyticsContext & { timestamp: string } {
  return {
    ...ctx,
    timestamp: ctx.timestamp ?? new Date().toISOString(),
  };
}

function logEvent(eventName: string, ctx: GrowthAnalyticsContext): void {
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    console.info("[growth.analytics]", eventName, JSON.stringify(ctx));
  }
}

export function trackVisitor(context: GrowthAnalyticsContext): void {
  const ctx = withTimestamp(context);
  increment("devflow.visitors.count");
  logEvent(DEVFLOW_FUNNEL_EVENTS.VISITOR_LANDED, ctx);
}

export function trackSimulatorUsage(context: GrowthAnalyticsContext): void {
  const ctx = withTimestamp(context);
  increment("devflow.simulator.usage");
  logEvent(DEVFLOW_FUNNEL_EVENTS.SIMULATOR_USED, ctx);
}

export function trackLeadSubmission(context: GrowthAnalyticsContext): void {
  const ctx = withTimestamp(context);
  increment("devflow.leads.submitted");
  logEvent(DEVFLOW_FUNNEL_EVENTS.LEAD_SUBMITTED, ctx);
}

export function trackSignupStarted(context: GrowthAnalyticsContext): void {
  const ctx = withTimestamp(context);
  increment("devflow.signup.started");
  logEvent(DEVFLOW_FUNNEL_EVENTS.SIGNUP_STARTED, ctx);
}

export function trackSignupCompleted(context: GrowthAnalyticsContext): void {
  const ctx = withTimestamp(context);
  increment("devflow.signup.completed");
  logEvent(DEVFLOW_FUNNEL_EVENTS.SIGNUP_COMPLETED, ctx);
}

export function trackHouseholdCreated(context: GrowthAnalyticsContext): void {
  const ctx = withTimestamp(context);
  increment("devflow.households.created");
  logEvent(DEVFLOW_FUNNEL_EVENTS.HOUSEHOLD_CREATED, ctx);
}

export function trackFirstExpenseCreated(context: GrowthAnalyticsContext): void {
  const ctx = withTimestamp(context);
  increment("devflow.activation.expense");
  logEvent(DEVFLOW_FUNNEL_EVENTS.FIRST_EXPENSE_CREATED, ctx);
}

export function trackFirstIncomeCreated(context: GrowthAnalyticsContext): void {
  const ctx = withTimestamp(context);
  increment("devflow.activation.income");
  logEvent(DEVFLOW_FUNNEL_EVENTS.FIRST_INCOME_CREATED, ctx);
}

export function trackFirstRuleCreated(context: GrowthAnalyticsContext): void {
  const ctx = withTimestamp(context);
  increment("devflow.activation.rule");
  logEvent(DEVFLOW_FUNNEL_EVENTS.FIRST_RULE_CREATED, ctx);
}
