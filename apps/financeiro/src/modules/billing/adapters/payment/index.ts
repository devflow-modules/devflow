/**
 * Re-export from shared billing-core package.
 * Product-specific billing logic stays in this module (BillingService, plans, etc.).
 */
export {
  stripePaymentAdapter,
  createCheckoutSession,
  validateWebhook,
  parseWebhookEvent,
  stripeCustomerPortalAdapter,
  createCustomerPortalSession,
} from "@devflow/billing-core";
export type {
  PlanIdPaid,
  CreateCheckoutParams,
  CreateCheckoutResult,
  WebhookParsedEvent,
  PaymentAdapter,
  CreateCustomerPortalParams,
  CreateCustomerPortalResult,
  CustomerPortalAdapter,
} from "@devflow/billing-core";
