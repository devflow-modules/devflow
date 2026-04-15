/**
 * Billing Observer — observabilidade, auditoria e monitoramento.
 * Logs padronizados + BillingAuditLog para rastreabilidade.
 */

import { createBillingAuditLogAsync } from "./infrastructure/billingAuditRepository";

const STRIPE_EVENT_TYPES = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "invoice.finalized",
  "invoice.paid",
  "invoice.upcoming",
] as const;

function isStripeEventCritical(type: string): boolean {
  return STRIPE_EVENT_TYPES.some((t) => type === t);
}

/**
 * Loga evento Stripe no audit e em console.
 */
export function logStripeEvent(
  event: { id: string; type: string },
  tenantId: string | null
): void {
  if (!isStripeEventCritical(event.type)) return;

  const tenant = tenantId ?? "unknown";
  console.log(`[STRIPE] event=${event.type} tenant=${tenant} ref=${event.id}`);

  if (tenantId) {
    createBillingAuditLogAsync({
      tenantId,
      eventType: event.type,
      source: "stripe",
      referenceId: event.id,
      metadata: { eventType: event.type },
    });
  }
}

/**
 * Loga uso registrado (mensagem ou IA).
 */
export function logUsageEvent(
  tenantId: string,
  feature: "messages" | "ai",
  quantity: number
): void {
  console.log(`[USAGE] tenant=${tenantId} feature=${feature} qty=${quantity}`);

  createBillingAuditLogAsync({
    tenantId,
    eventType: "usage.registered",
    source: "usage",
    metadata: { feature, quantity },
  });
}

/**
 * Loga bloqueio por limite excedido.
 */
export function logLimitExceeded(
  tenantId: string,
  feature: "messages" | "ai"
): void {
  console.warn(`[USAGE][BLOCKED] tenant=${tenantId} feature=${feature}`);

  createBillingAuditLogAsync({
    tenantId,
    eventType: "usage.limit_exceeded",
    source: "usage",
    metadata: { feature, severity: "blocked" },
  });
}

/**
 * Loga overage enviado ao Stripe.
 */
export function logOverageSent(
  tenantId: string,
  feature: "messages" | "ai",
  quantity: number
): void {
  createBillingAuditLogAsync({
    tenantId,
    eventType: "usage.overage_sent",
    source: "usage",
    metadata: { feature, quantity },
  });
}

/**
 * Loga erro do sistema (webhook, reportUsage, etc).
 */
export function logSystemError(params: {
  tenantId: string;
  context: string;
  error: unknown;
  metadata?: Record<string, unknown>;
}): void {
  const err = params.error instanceof Error ? params.error : new Error(String(params.error));
  const msg = err.message;
  const stack = err.stack ?? undefined;

  console.error(`[BILLING][ERROR] context=${params.context} tenant=${params.tenantId}`, err);

  createBillingAuditLogAsync({
    tenantId: params.tenantId,
    eventType: "system.error",
    source: "system",
    metadata: {
      context: params.context,
      errorMessage: msg,
      stack,
      ...params.metadata,
    },
  });
}

/**
 * Hook: uso >= 80% do limite (base para alertas).
 */
/** Pacote incluído ultrapassado sem bloquear envio (plano pago, soft limit). */
export function logSoftMessageOverIncluded(
  tenantId: string,
  used: number,
  limit: number,
  afterAction: number
): void {
  console.warn(
    `[BILLING][SOFT_LIMIT] tenant=${tenantId} messages after=${afterAction} included=${limit} (sem bloqueio)`
  );
  void createBillingAuditLogAsync({
    tenantId,
    eventType: "usage.soft_over_included",
    source: "usage",
    metadata: { feature: "messages", used, limit, afterAction },
  });
}

/** Alerta interno: primeiro cruzamento de 5000 mensagens no período (margem / revisão comercial). */
export function logHighWaterMessagesCrossing5000(
  tenantId: string,
  usedBefore: number,
  afterAction: number
): void {
  if (afterAction < 5000 || usedBefore >= 5000) return;
  console.warn(`[BILLING][HIGH_WATER] tenant=${tenantId} messages>=5000 in period (after=${afterAction})`);
  void createBillingAuditLogAsync({
    tenantId,
    eventType: "usage.messages_high_water_5k",
    source: "usage",
    metadata: { afterAction, threshold: 5000 },
  });
}

export function logUsageThresholdWarning(
  tenantId: string,
  feature: "messages" | "ai",
  used: number,
  limit: number,
  percent: number
): void {
  if (percent < 80) return;

  console.warn(
    `[BILLING][WARN] tenant=${tenantId} feature=${feature} used=${used} limit=${limit} (${percent}%)`
  );

  createBillingAuditLogAsync({
    tenantId,
    eventType: "usage.threshold_warning",
    source: "usage",
    metadata: { feature, used, limit, percent },
  });
}

/**
 * Hook: invoice falhou (crítico).
 */
export function logInvoicePaymentFailed(
  tenantId: string,
  invoiceId: string,
  metadata?: Record<string, unknown>
): void {
  console.error(`[BILLING][CRITICAL] invoice.payment_failed tenant=${tenantId} invoice=${invoiceId}`);

  createBillingAuditLogAsync({
    tenantId,
    eventType: "invoice.payment_failed",
    source: "stripe",
    referenceId: invoiceId,
    metadata: { ...metadata },
  });
}
