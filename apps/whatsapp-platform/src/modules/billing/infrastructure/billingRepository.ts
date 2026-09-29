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

export type StripeWebhookProcessStatus = "RECEIVED" | "PROCESSING" | "PROCESSED" | "FAILED";

export type ClaimStripeWebhookResult =
  | { action: "process"; rowId: string }
  | { action: "skip_duplicate" }
  | { action: "skip_in_progress" };

/**
 * Claim ou re-claim de evento Stripe para processamento.
 * - Novo → RECEIVED→PROCESSING, process
 * - PROCESSED → skip
 * - PROCESSING recente → skip_in_progress (outro worker)
 * - FAILED ou PROCESSING stale → re-claim e process
 */
export async function claimStripeWebhookEvent(
  stripeEventId: string,
  eventType: string,
  opts?: { staleProcessingMs?: number }
): Promise<ClaimStripeWebhookResult> {
  const staleMs = opts?.staleProcessingMs ?? 5 * 60 * 1000;

  try {
    const created = await prisma.stripeWebhookEvent.create({
      data: {
        stripeEventId,
        eventType,
        status: "PROCESSING",
        attemptCount: 1,
        processedAt: null,
      },
    });
    return { action: "process", rowId: created.id };
  } catch {
    const existing = await prisma.stripeWebhookEvent.findUnique({
      where: { stripeEventId },
    });
    if (!existing) {
      return { action: "skip_duplicate" };
    }
    if (existing.status === "PROCESSED") {
      return { action: "skip_duplicate" };
    }
    if (existing.status === "PROCESSING") {
      const age = Date.now() - new Date(existing.updatedAt).getTime();
      if (age < staleMs) {
        return { action: "skip_in_progress" };
      }
    }
    // FAILED or stale PROCESSING → reclaim
    const updated = await prisma.stripeWebhookEvent.updateMany({
      where: {
        id: existing.id,
        status: { in: ["FAILED", "PROCESSING", "RECEIVED"] },
      },
      data: {
        status: "PROCESSING",
        eventType,
        attemptCount: { increment: 1 },
        lastError: null,
      },
    });
    if (updated.count !== 1) {
      return { action: "skip_in_progress" };
    }
    return { action: "process", rowId: existing.id };
  }
}

export async function markStripeWebhookProcessed(rowId: string): Promise<void> {
  await prisma.stripeWebhookEvent.update({
    where: { id: rowId },
    data: {
      status: "PROCESSED",
      processedAt: new Date(),
      lastError: null,
    },
  });
}

export async function markStripeWebhookFailed(rowId: string, error: unknown): Promise<void> {
  const msg = (error instanceof Error ? error.message : String(error)).slice(0, 2000);
  await prisma.stripeWebhookEvent.update({
    where: { id: rowId },
    data: {
      status: "FAILED",
      lastError: msg,
      processedAt: null,
    },
  });
}

/** @deprecated Prefer claimStripeWebhookEvent — retained for transitional callers/tests. */
export async function ensureWebhookIdempotency(
  stripeEventId: string,
  eventType: string
): Promise<boolean> {
  const claim = await claimStripeWebhookEvent(stripeEventId, eventType);
  return claim.action === "process";
}
