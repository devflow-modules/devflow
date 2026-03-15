/**
 * Eventos de monetização: integração com growth metrics.
 */

import { increment } from "@/analytics/growth/growthMetrics";

export type BillingAnalyticsContext = {
  userId?: string;
  sessionId?: string;
  plan?: string;
};

export function trackPlanViewed(context: BillingAnalyticsContext = {}): void {
  increment("devflow.billing.plan_viewed");
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    console.info("[billing.analytics]", "billing.plan_viewed", context);
  }
}

export function trackUpgradeClicked(context: BillingAnalyticsContext = {}): void {
  increment("devflow.billing.upgrade_clicked");
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    console.info("[billing.analytics]", "billing.upgrade_clicked", context);
  }
}
