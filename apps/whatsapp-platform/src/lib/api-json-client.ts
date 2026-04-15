/**
 * Desembrulha respostas no contrato `{ success, data, error, trace_id }` para consumo no cliente.
 * Compatível com payloads legados (objeto direto sem `success`).
 */
export function unwrapApiData<T>(raw: unknown): T | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.success === true && "data" in o) {
    return o.data as T;
  }
  return raw as T;
}

type SubscriptionViewLike = {
  plan: string;
  tenantCreatedAt?: string | null;
  status: string;
  stripeCustomerId: string | null;
  currentPeriodEnd: string | null;
  activeUntil: string | null;
  cancelAtPeriodEnd: boolean;
  meteredBillingConfigured: boolean;
  lastInvoiceId: string | null;
  lastInvoiceStatus: string | null;
  lastInvoiceAmountPaid: number | null;
};

/** GET /api/billing/subscription — novo contrato (`data.subscription`) ou legado (`data` = vista). */
export function readSubscriptionFromApiJson(raw: unknown): SubscriptionViewLike | null {
  const u = unwrapApiData<{ subscription?: SubscriptionViewLike } | SubscriptionViewLike>(raw);
  if (!u || typeof u !== "object") return null;
  if ("subscription" in u && u.subscription && typeof u.subscription === "object") {
    return u.subscription as SubscriptionViewLike;
  }
  if ("plan" in u && typeof (u as SubscriptionViewLike).plan === "string") {
    return u as SubscriptionViewLike;
  }
  return null;
}

/** GET /api/auth/verify — `data.valid` / `data.user` ou legado no topo. */
export function readVerifyPayload(raw: unknown): {
  valid?: boolean;
  user?: { role?: string; id?: string; email?: string; name?: string; tenantId?: string };
} {
  const inner = unwrapApiData<{
    valid?: boolean;
    user?: { role?: string; id?: string; email?: string; name?: string; tenantId?: string };
  }>(raw);
  if (inner && (inner.user || inner.valid !== undefined)) {
    return { valid: inner.valid, user: inner.user };
  }
  const o = raw as { valid?: boolean; user?: { role?: string } };
  return { valid: o.valid, user: o.user };
}

/** POST /api/billing/checkout | /api/billing/portal — `data.url` no contrato novo. */
export function readBillingPostUrl(raw: unknown): string | undefined {
  const u = unwrapApiData<{ url?: string }>(raw);
  if (u?.url) return u.url;
  const legacy = raw as { data?: { url?: string } };
  return legacy.data?.url;
}
