/**
 * Stripe metered usage — subscription items + usage records.
 * Requer STRIPE_METERED_PRICE_MESSAGES e STRIPE_METERED_PRICE_AI (ou variantes _TEST em dev).
 */

import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { UsageEventType } from "@/generated/prisma-whatsapp";

const MAX_STRIPE_REPORT_ATTEMPTS = 8;

function getSecretKey(): string {
  const isDev = process.env.NODE_ENV !== "production";
  const testKey = process.env.STRIPE_TEST_SECRET_KEY;
  const liveKey = process.env.STRIPE_SECRET_KEY;
  if (isDev && testKey) return testKey;
  if (liveKey) return liveKey;
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export function getStripe(): Stripe {
  return new Stripe(getSecretKey());
}

export function getMeteredPriceIds(): { messages: string | null; ai: string | null } {
  const isDev = process.env.NODE_ENV !== "production";
  const msg =
    (isDev && process.env.STRIPE_TEST_METERED_PRICE_MESSAGES) ||
    process.env.STRIPE_METERED_PRICE_MESSAGES ||
    null;
  const ai =
    (isDev && process.env.STRIPE_TEST_METERED_PRICE_AI) || process.env.STRIPE_METERED_PRICE_AI || null;
  return { messages: msg, ai: ai };
}

export function isMeteredBillingConfigured(): boolean {
  const { messages, ai } = getMeteredPriceIds();
  return !!(messages && ai);
}

/** Anexa itens metered à subscription se faltarem; atualiza DB com subscription item ids. */
export async function ensureMeteredItemsOnSubscription(
  tenantId: string,
  subscriptionId: string
): Promise<void> {
  const { messages: msgPriceId, ai: aiPriceId } = getMeteredPriceIds();
  if (!msgPriceId || !aiPriceId) return;

  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });

  const items = sub.items.data;
  let msgItem = items.find((i) => i.price.id === msgPriceId);
  let aiItem = items.find((i) => i.price.id === aiPriceId);

  if (!msgItem) {
    msgItem = await stripe.subscriptionItems.create({
      subscription: subscriptionId,
      price: msgPriceId,
    });
  }
  if (!aiItem) {
    aiItem = await stripe.subscriptionItems.create({
      subscription: subscriptionId,
      price: aiPriceId,
    });
  }

  await prisma.billingSubscription.updateMany({
    where: { tenantId },
    data: {
      stripeMessagePriceId: msgPriceId,
      stripeAiPriceId: aiPriceId,
      stripeSubscriptionItemMsgId: msgItem.id,
      stripeSubscriptionItemAiId: aiItem.id,
    },
  });
}

export async function syncMeteredItemIdsFromSubscription(
  tenantId: string,
  subscription: Stripe.Subscription
): Promise<void> {
  const { messages: msgPriceId, ai: aiPriceId } = getMeteredPriceIds();
  if (!msgPriceId || !aiPriceId) return;

  const msgItem = subscription.items.data.find((i) => i.price.id === msgPriceId);
  const aiItem = subscription.items.data.find((i) => i.price.id === aiPriceId);

  await prisma.billingSubscription.updateMany({
    where: { tenantId },
    data: {
      stripeMessagePriceId: msgPriceId,
      stripeAiPriceId: aiPriceId,
      ...(msgItem ? { stripeSubscriptionItemMsgId: msgItem.id } : {}),
      ...(aiItem ? { stripeSubscriptionItemAiId: aiItem.id } : {}),
    },
  });
}

/**
 * Envia uso ao Stripe (increment). Idempotência: mesmo usageEventId = mesmo efeito.
 */
export async function reportUsageToStripe(params: {
  tenantId: string;
  type: UsageEventType;
  quantity: number;
  usageEventId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isMeteredBillingConfigured()) {
    return { ok: false, error: "metered_prices_not_configured" };
  }

  const subRow = await prisma.billingSubscription.findUnique({
    where: { tenantId: params.tenantId },
  });
  if (!subRow?.stripeSubscriptionId) {
    return { ok: false, error: "no_active_subscription" };
  }
  const activeStatuses = ["active", "trialing"];
  if (!activeStatuses.includes(subRow.status)) {
    return { ok: false, error: `subscription_status_${subRow.status}` };
  }

  let itemId: string | undefined =
    params.type === UsageEventType.MESSAGE_SENT
      ? (subRow.stripeSubscriptionItemMsgId ?? undefined)
      : (subRow.stripeSubscriptionItemAiId ?? undefined);

  if (!itemId) {
    await ensureMeteredItemsOnSubscription(params.tenantId, subRow.stripeSubscriptionId);
    const refreshed = await prisma.billingSubscription.findUnique({
      where: { tenantId: params.tenantId },
    });
    itemId =
      params.type === UsageEventType.MESSAGE_SENT
        ? refreshed?.stripeSubscriptionItemMsgId ?? undefined
        : refreshed?.stripeSubscriptionItemAiId ?? undefined;
  }
  if (!itemId) {
    return { ok: false, error: "missing_subscription_item" };
  }

  const stripe = getStripe();
  const ts = Math.floor(Date.now() / 1000);

  try {
    await stripe.subscriptionItems.createUsageRecord(
      itemId,
      {
        quantity: params.quantity,
        timestamp: ts,
        action: "increment",
      },
      {
        idempotencyKey: `wplat-usage-${params.usageEventId}`,
      }
    );
    await prisma.usageEvent.update({
      where: { id: params.usageEventId },
      data: {
        reportedToStripeAt: new Date(),
        stripeReportLastError: null,
      },
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const errStr = msg.slice(0, 2000);
    await prisma.usageEvent.update({
      where: { id: params.usageEventId },
      data: {
        stripeReportAttempts: { increment: 1 },
        stripeReportLastError: errStr,
      },
    });
    return { ok: false, error: errStr };
  }
}

/** Retry assíncrono com backoff simples (não bloqueia). */
export function scheduleStripeUsageRetry(
  tenantId: string,
  type: UsageEventType,
  quantity: number,
  usageEventId: string,
  attempt: number
): void {
  if (attempt >= MAX_STRIPE_REPORT_ATTEMPTS) return;
  const delayMs = Math.min(30_000 * Math.pow(2, attempt), 600_000);
  setTimeout(() => {
    void reportUsageToStripe({ tenantId, type, quantity, usageEventId }).then((r) => {
      if (!r.ok && r.error !== "metered_prices_not_configured") {
        scheduleStripeUsageRetry(tenantId, type, quantity, usageEventId, attempt + 1);
      }
    });
  }, delayMs);
}

export function queueReportUsageToStripe(
  tenantId: string,
  type: UsageEventType,
  quantity: number,
  usageEventId: string
): void {
  void reportUsageToStripe({ tenantId, type, quantity, usageEventId }).then((r) => {
    if (!r.ok && r.error !== "metered_prices_not_configured" && r.error !== "no_active_subscription") {
      scheduleStripeUsageRetry(tenantId, type, quantity, usageEventId, 0);
    }
  });
}

/** Processa eventos ainda não reportados (cron / fallback). */
export async function retryPendingStripeUsageReports(limit = 50): Promise<{
  processed: number;
  succeeded: number;
}> {
  if (!isMeteredBillingConfigured()) return { processed: 0, succeeded: 0 };

  const pending = await prisma.usageEvent.findMany({
    where: {
      reportedToStripeAt: null,
      stripeReportAttempts: { lt: MAX_STRIPE_REPORT_ATTEMPTS },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let succeeded = 0;
  for (const ev of pending) {
    const r = await reportUsageToStripe({
      tenantId: ev.tenantId,
      type: ev.type,
      quantity: ev.quantity,
      usageEventId: ev.id,
    });
    if (r.ok) succeeded += 1;
  }
  return { processed: pending.length, succeeded };
}
