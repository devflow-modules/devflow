/**
 * Tipos comuns para adapters de pagamento (Stripe, Lemon, Paddle, etc.).
 */

export type PlanIdPaid = "PRO" | "TEAM";

export type CreateCheckoutParams = {
  userId: string;
  email: string;
  planId: PlanIdPaid;
  successUrl: string;
  cancelUrl: string;
};

export type CreateCheckoutResult = {
  checkoutUrl: string;
  sessionId?: string;
};

export type WebhookParsedEvent = {
  type: string;
  userId?: string;
  planId?: PlanIdPaid;
  subscriptionId?: string;
  stripeCustomerId?: string;
  /** true = cancelamento agendado para fim do período (não imediato) */
  cancelAtPeriodEnd?: boolean;
  /** email do customer (evento customer.updated) */
  stripeCustomerEmail?: string;
};

export type PaymentAdapter = {
  createCheckoutSession(params: CreateCheckoutParams): Promise<CreateCheckoutResult>;
  validateWebhook(signature: string, payload: string | Buffer): Promise<unknown>;
  parseWebhookEvent(payload: unknown): WebhookParsedEvent | null;
};

// ---------------------------------------------------------------------------
// Customer Portal
// ---------------------------------------------------------------------------

export type CreateCustomerPortalParams = {
  stripeCustomerId: string;
  returnUrl: string;
};

export type CreateCustomerPortalResult = {
  portalUrl: string;
};

export type CustomerPortalAdapter = {
  createCustomerPortalSession(
    params: CreateCustomerPortalParams
  ): Promise<CreateCustomerPortalResult>;
};
