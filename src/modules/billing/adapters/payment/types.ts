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
};

export type PaymentAdapter = {
  createCheckoutSession(params: CreateCheckoutParams): Promise<CreateCheckoutResult>;
  validateWebhook(signature: string, payload: string | Buffer): Promise<unknown>;
  parseWebhookEvent(payload: unknown): WebhookParsedEvent | null;
};
