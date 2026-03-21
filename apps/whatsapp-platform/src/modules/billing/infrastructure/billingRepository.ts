/**
 * Billing data access layer.
 * Centralizes Prisma operations for billing entities.
 */

import { prisma } from "@/lib/prisma";

export type BillingSubscriptionRow = {
  id: string;
  tenantId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  plan: string;
  status: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  messagesIncludedUsed: number;
  aiIncludedUsed: number;
  messagesOverageSent: number;
  aiOverageSent: number;
};

export async function getBillingSubscriptionByTenant(
  tenantId: string
): Promise<BillingSubscriptionRow | null> {
  const row = await prisma.billingSubscription.findUnique({
    where: { tenantId },
    select: {
      id: true,
      tenantId: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      plan: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      messagesIncludedUsed: true,
      aiIncludedUsed: true,
      messagesOverageSent: true,
      aiOverageSent: true,
    },
  });
  return row as BillingSubscriptionRow | null;
}

export async function getBillingSubscriptionByStripeCustomer(
  stripeCustomerId: string
): Promise<BillingSubscriptionRow | null> {
  const row = await prisma.billingSubscription.findFirst({
    where: { stripeCustomerId },
    select: {
      id: true,
      tenantId: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      plan: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      messagesIncludedUsed: true,
      aiIncludedUsed: true,
      messagesOverageSent: true,
      aiOverageSent: true,
    },
  });
  return row as BillingSubscriptionRow | null;
}

export async function updateQuotaUsage(
  tenantId: string,
  data: {
    messagesIncludedUsed?: number;
    aiIncludedUsed?: number;
    messagesOverageSent?: number;
    aiOverageSent?: number;
  }
): Promise<void> {
  await prisma.billingSubscription.updateMany({
    where: { tenantId },
    data,
  });
}

export async function resetQuotaForNewPeriod(tenantId: string): Promise<void> {
  await prisma.billingSubscription.updateMany({
    where: { tenantId },
    data: {
      messagesIncludedUsed: 0,
      aiIncludedUsed: 0,
      messagesOverageSent: 0,
      aiOverageSent: 0,
    },
  });
}

export async function upsertBillingSubscription(
  tenantId: string,
  data: {
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    plan?: string;
    status?: string;
    currentPeriodStart?: Date | null;
    currentPeriodEnd?: Date | null;
    cancelAtPeriodEnd?: boolean;
    lastInvoiceId?: string | null;
    lastInvoiceStatus?: string | null;
    lastInvoiceAmountPaid?: number | null;
  }
): Promise<void> {
  const existing = await prisma.billingSubscription.findUnique({
    where: { tenantId },
    select: { currentPeriodStart: true },
  });

  const newPeriodStart = data.currentPeriodStart;
  const periodChanged =
    newPeriodStart != null &&
    existing?.currentPeriodStart != null &&
    newPeriodStart.getTime() !== existing.currentPeriodStart.getTime();

  const resetQuota = periodChanged
    ? {
        messagesIncludedUsed: 0,
        aiIncludedUsed: 0,
        messagesOverageSent: 0,
        aiOverageSent: 0,
      }
    : {};

  await prisma.billingSubscription.upsert({
    where: { tenantId },
    create: {
      tenantId,
      stripeCustomerId: data.stripeCustomerId ?? null,
      stripeSubscriptionId: data.stripeSubscriptionId ?? null,
      plan: data.plan ?? "FREE",
      status: data.status ?? "active",
      currentPeriodStart: data.currentPeriodStart ?? null,
      currentPeriodEnd: data.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
      lastInvoiceId: data.lastInvoiceId ?? null,
      lastInvoiceStatus: data.lastInvoiceStatus ?? null,
      lastInvoiceAmountPaid: data.lastInvoiceAmountPaid ?? null,
    },
    update: {
      ...(data.stripeCustomerId !== undefined && { stripeCustomerId: data.stripeCustomerId }),
      ...(data.stripeSubscriptionId !== undefined && {
        stripeSubscriptionId: data.stripeSubscriptionId,
      }),
      ...(data.plan !== undefined && { plan: data.plan }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.currentPeriodStart !== undefined && { currentPeriodStart: data.currentPeriodStart }),
      ...(data.currentPeriodEnd !== undefined && { currentPeriodEnd: data.currentPeriodEnd }),
      ...(data.cancelAtPeriodEnd !== undefined && { cancelAtPeriodEnd: data.cancelAtPeriodEnd }),
      ...(data.lastInvoiceId !== undefined && { lastInvoiceId: data.lastInvoiceId }),
      ...(data.lastInvoiceStatus !== undefined && { lastInvoiceStatus: data.lastInvoiceStatus }),
      ...(data.lastInvoiceAmountPaid !== undefined && {
        lastInvoiceAmountPaid: data.lastInvoiceAmountPaid,
      }),
      ...resetQuota,
    },
  });
}

export async function ensureWebhookIdempotency(
  stripeEventId: string,
  eventType: string
): Promise<boolean> {
  try {
    await prisma.stripeWebhookEvent.create({
      data: {
        stripeEventId,
        eventType,
      },
    });
    return true;
  } catch {
    return false;
  }
}
