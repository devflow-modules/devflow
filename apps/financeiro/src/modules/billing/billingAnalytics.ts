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

export function trackCheckoutStarted(context: { userId?: string; planId?: string } = {}): void {
  increment("devflow.billing.checkout_started");
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    console.info("[billing.analytics]", "billing.checkout_started", context);
  }
}

export function trackPaymentCompleted(context: { userId?: string; planId?: string } = {}): void {
  increment("devflow.billing.payment_completed");
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    console.info("[billing.analytics]", "billing.payment_completed", context);
  }
}

export function trackSubscriptionCancelled(context: { userId?: string } = {}): void {
  increment("devflow.billing.subscription_cancelled");
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    console.info("[billing.analytics]", "billing.subscription_cancelled", context);
  }
}

export function trackSubscriptionManageClicked(context: BillingAnalyticsContext = {}): void {
  increment("devflow.billing.subscription_manage_clicked");
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    console.info("[billing.analytics]", "billing.subscription_manage_clicked", context);
  }
}

export function trackCustomerPortalOpened(context: { userId?: string } = {}): void {
  increment("devflow.billing.customer_portal_opened");
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    console.info("[billing.analytics]", "billing.customer_portal_opened", context);
  }
}

export function trackSubscriptionCancelledPortal(context: { userId?: string } = {}): void {
  increment("devflow.billing.subscription_cancelled_portal");
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    console.info("[billing.analytics]", "billing.subscription_cancelled_portal", context);
  }
}

export function trackSubscriptionUpdatedPortal(context: { userId?: string; planId?: string } = {}): void {
  increment("devflow.billing.subscription_updated_portal");
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    console.info("[billing.analytics]", "billing.subscription_updated_portal", context);
  }
}

export function trackSubscriptionPendingCancellation(context: { userId?: string } = {}): void {
  increment("devflow.billing.subscription_pending_cancellation");
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    console.info("[billing.analytics]", "billing.subscription_pending_cancellation", context);
  }
}

export function trackSubscriptionReactivated(context: { userId?: string } = {}): void {
  increment("devflow.billing.subscription_reactivated");
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    console.info("[billing.analytics]", "billing.subscription_reactivated", context);
  }
}

export function trackCustomerUpdated(context: { stripeCustomerId?: string } = {}): void {
  increment("devflow.billing.customer_updated");
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    console.info("[billing.analytics]", "billing.customer_updated", context);
  }
}
