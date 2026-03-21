/**
 * Billing Webhook Service — lógica de negócio para eventos Stripe.
 * Centraliza handlers de cada evento. Chamado apenas pelo route após validação.
 */

import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/modules/stripe/stripeClient";
import { parseWebhookEvent } from "@/modules/stripe/stripeWebhook";
import {
  syncSubscriptionFromStripe,
  markSubscriptionPastDue,
} from "@/modules/stripe/stripeSyncService";
import { logInvoicePaymentFailed } from "./billingObserverService";

function mapPlanToLocal(plan?: string | null): string {
  const p = (plan ?? "FREE").toUpperCase();
  if (p === "TEAM") return "SCALE";
  if (p === "STARTER") return "STARTER";
  if (p === "PRO") return "PRO";
  if (p === "SCALE") return "SCALE";
  return "FREE";
}

/** Resolve tenantId a partir de metadata ou stripeCustomerId. */
export async function resolveTenantId(
  parsed: { tenantId?: string; stripeCustomerId?: string } | null
): Promise<string | null> {
  if (!parsed) return null;
  if (parsed.tenantId) return parsed.tenantId;
  if (!parsed.stripeCustomerId) return null;
  const tenant = await prisma.tenant.findFirst({
    where: { stripeCustomerId: parsed.stripeCustomerId },
    select: { id: true },
  });
  return tenant?.id ?? null;
}

/** Resolve tenantId por stripeCustomerId em Tenant, TenantSubscription ou BillingSubscription. */
export async function resolveTenantIdFromCustomer(
  stripeCustomerId: string
): Promise<string | null> {
  const [tenantByCustomer, tenantBySub, billingBySub] = await Promise.all([
    prisma.tenant.findFirst({ where: { stripeCustomerId }, select: { id: true } }),
    prisma.tenantSubscription.findFirst({
      where: { stripeCustomerId },
      select: { tenantId: true },
    }),
    prisma.billingSubscription.findFirst({
      where: { stripeCustomerId },
      select: { tenantId: true },
    }),
  ]);
  return (
    tenantByCustomer?.id ?? tenantBySub?.tenantId ?? billingBySub?.tenantId ?? null
  );
}

async function getResolvedTenantId(
  parsed: { tenantId?: string; stripeCustomerId?: string } | null,
  fallbackTenantId: string | null
): Promise<string | null> {
  if (fallbackTenantId) return fallbackTenantId;
  if (!parsed?.stripeCustomerId) return null;
  return resolveTenantIdFromCustomer(parsed.stripeCustomerId);
}

/**
 * checkout.session.completed
 * Vincula customerId ao tenant, garante criação/sync da subscription.
 */
async function handleCheckoutCompleted(
  event: Stripe.Event,
  parsed: NonNullable<ReturnType<typeof parseWebhookEvent>>,
  tenantId: string | null,
  stripe: Stripe
): Promise<void> {
  const resolvedTenantId = await getResolvedTenantId(parsed, tenantId);
  if (!resolvedTenantId) return;

  const plan = mapPlanToLocal(parsed.plan);
  await prisma.tenant.update({
    where: { id: resolvedTenantId },
    data: {
      plan: plan.toLowerCase(),
      stripeCustomerId: parsed.stripeCustomerId ?? undefined,
      activeUntil: null,
    },
  });

  if (parsed.subscriptionId) {
    const sub = await stripe.subscriptions.retrieve(parsed.subscriptionId);
    const activeUntil = sub.current_period_end
      ? new Date(sub.current_period_end * 1000)
      : null;
    if (activeUntil) {
      await prisma.tenant.update({
        where: { id: resolvedTenantId },
        data: { activeUntil },
      });
    }
    await syncSubscriptionFromStripe(
      resolvedTenantId,
      parsed.stripeCustomerId ?? null,
      sub
    );
  }
}

/**
 * customer.subscription.created
 * Cria registro em BillingSubscription, define plan, status, currentPeriodEnd.
 */
async function handleSubscriptionCreated(
  event: Stripe.Event,
  parsed: NonNullable<ReturnType<typeof parseWebhookEvent>>,
  tenantId: string | null,
  stripe: Stripe
): Promise<void> {
  const resolvedTenantId = await getResolvedTenantId(parsed, tenantId);
  if (!resolvedTenantId) return;

  const plan = mapPlanToLocal(parsed.plan);
  await prisma.tenant.update({
    where: { id: resolvedTenantId },
    data: {
      plan: plan.toLowerCase(),
      stripeCustomerId: parsed.stripeCustomerId ?? undefined,
      activeUntil: null,
    },
  });

  if (parsed.subscriptionId) {
    const sub = await stripe.subscriptions.retrieve(parsed.subscriptionId);
    const activeUntil = sub.current_period_end
      ? new Date(sub.current_period_end * 1000)
      : null;
    if (activeUntil) {
      await prisma.tenant.update({
        where: { id: resolvedTenantId },
        data: { activeUntil },
      });
    }
    await syncSubscriptionFromStripe(
      resolvedTenantId,
      parsed.stripeCustomerId ?? null,
      sub
    );
  }
}

/**
 * customer.subscription.updated
 * Atualiza plan, status, currentPeriodEnd.
 */
async function handleSubscriptionUpdated(
  event: Stripe.Event,
  parsed: NonNullable<ReturnType<typeof parseWebhookEvent>>,
  tenantId: string | null,
  stripe: Stripe
): Promise<void> {
  if (!parsed.subscriptionId) return;
  const resolvedTenantId = await getResolvedTenantId(parsed, tenantId);
  if (!resolvedTenantId) return;

  const sub = await stripe.subscriptions.retrieve(parsed.subscriptionId);
  const plan = parsed.plan ? mapPlanToLocal(parsed.plan) : undefined;
  const activeUntil = sub.current_period_end
    ? new Date(sub.current_period_end * 1000)
    : null;

  await prisma.tenant.update({
    where: { id: resolvedTenantId },
    data: {
      ...(plan ? { plan: plan.toLowerCase() } : {}),
      stripeCustomerId: parsed.stripeCustomerId ?? undefined,
      activeUntil: activeUntil ?? undefined,
    },
  });
  await syncSubscriptionFromStripe(
    resolvedTenantId,
    parsed.stripeCustomerId ?? null,
    sub
  );
}

/**
 * customer.subscription.deleted
 * Atualiza plan = "free", status = "canceled".
 */
async function handleSubscriptionDeleted(
  event: Stripe.Event,
  parsed: ReturnType<typeof parseWebhookEvent>,
  tenantId: string | null
): Promise<void> {
  const resolvedTenantId =
    tenantId ??
    (parsed?.stripeCustomerId
      ? await resolveTenantIdFromCustomer(parsed.stripeCustomerId)
      : null);
  if (!resolvedTenantId) return;

  await prisma.tenant.update({
    where: { id: resolvedTenantId },
    data: { plan: "free", activeUntil: null },
  });
  await syncSubscriptionFromStripe(resolvedTenantId, null, null);
  await prisma.billingSubscription.updateMany({
    where: { tenantId: resolvedTenantId },
    data: {
      status: "canceled",
      stripeSubscriptionId: null,
      cancelAtPeriodEnd: false,
      stripeSubscriptionItemMsgId: null,
      stripeSubscriptionItemAiId: null,
    },
  });
}

/**
 * invoice.payment_succeeded
 * Atualiza lastInvoiceId, lastInvoiceAmountPaid, status = "active".
 */
async function handleInvoicePaymentSucceeded(
  event: Stripe.Event,
  parsed: ReturnType<typeof parseWebhookEvent>,
  tenantId: string | null,
  stripe: Stripe
): Promise<void> {
  const inv = event.data.object as Stripe.Invoice;
  const subRef = inv.subscription;
  const subId = typeof subRef === "string" ? subRef : subRef?.id;

  if (subId) {
    await prisma.billingSubscription.updateMany({
      where: { stripeSubscriptionId: subId },
      data: {
        lastInvoiceId: inv.id,
        lastInvoiceStatus: inv.status ?? "paid",
        lastInvoiceAmountPaid: inv.amount_paid ?? undefined,
        status: "active",
      },
    });
  }

  if (parsed?.subscriptionId) {
    const resolvedTenantId = await getResolvedTenantId(parsed, tenantId);
    if (resolvedTenantId) {
      const sub = await stripe.subscriptions.retrieve(parsed.subscriptionId);
      const activeUntil = sub.current_period_end
        ? new Date(sub.current_period_end * 1000)
        : null;
      if (activeUntil) {
        await prisma.tenant.update({
          where: { id: resolvedTenantId },
          data: { activeUntil },
        });
      }
      await syncSubscriptionFromStripe(
        resolvedTenantId,
        parsed.stripeCustomerId ?? null,
        sub
      );
    }
  }
}

/**
 * invoice.payment_failed
 * Atualiza status = "past_due".
 */
async function handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
  const inv = event.data.object as Stripe.Invoice;
  const cid =
    typeof inv.customer === "string" ? inv.customer : inv.customer?.id ?? undefined;
  if (cid) {
    const tenantId = await resolveTenantIdFromCustomer(cid);
    if (tenantId) {
      logInvoicePaymentFailed(tenantId, inv.id, { attemptCount: inv.attempt_count });
    }
    await markSubscriptionPastDue(cid);
  }
}

/**
 * invoice.finalized / invoice.paid
 * Atualiza lastInvoiceId, lastInvoiceStatus, lastInvoiceAmountPaid.
 */
async function handleInvoiceFinalizedOrPaid(event: Stripe.Event): Promise<void> {
  const inv = event.data.object as Stripe.Invoice;
  const subRef = inv.subscription;
  const subId = typeof subRef === "string" ? subRef : subRef?.id;
  if (subId) {
    await prisma.billingSubscription.updateMany({
      where: { stripeSubscriptionId: subId },
      data: {
        lastInvoiceId: inv.id,
        lastInvoiceStatus: inv.status ?? event.type,
        lastInvoiceAmountPaid: inv.amount_paid ?? undefined,
      },
    });
  }
}

/**
 * Dispatcher principal. Processa evento e delega para o handler correto.
 */
export async function handleStripeWebhookEvent(event: Stripe.Event): Promise<void> {
  const parsed = parseWebhookEvent(event);
  const tenantId = parsed?.tenantId ?? (await resolveTenantId(parsed)) ?? null;
  const stripe = getStripe();

  switch (event.type) {
    case "checkout.session.completed":
      if (parsed) {
        await handleCheckoutCompleted(event, parsed, tenantId, stripe);
      }
      break;

    case "customer.subscription.created":
      if (parsed) {
        await handleSubscriptionCreated(event, parsed, tenantId, stripe);
      }
      break;

    case "customer.subscription.updated":
      if (parsed) {
        await handleSubscriptionUpdated(event, parsed, tenantId, stripe);
      }
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event, parsed, tenantId);
      break;

    case "invoice.payment_succeeded":
      await handleInvoicePaymentSucceeded(event, parsed, tenantId, stripe);
      break;

    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event);
      break;

    case "invoice.finalized":
    case "invoice.paid":
      await handleInvoiceFinalizedOrPaid(event);
      break;

    case "invoice.upcoming":
      // TODO: notificar cliente sobre cobrança próxima (email, in-app)
      break;

    default:
      // Evento não tratado — logado no route
      break;
  }
}
