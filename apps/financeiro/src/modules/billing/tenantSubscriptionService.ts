import type { Prisma } from "@prisma/client";
import { prisma } from "@/modules/financeiro/lib/db";

export type TenantSubscriptionUpsertInput = {
  tenantId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  planCode?: string;
  status?: string;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
};

export async function upsertSubscription(data: TenantSubscriptionUpsertInput) {
  const {
    tenantId,
    stripeCustomerId,
    stripeSubscriptionId,
    stripePriceId,
    planCode,
    status,
    currentPeriodEnd,
    cancelAtPeriodEnd,
  } = data;

  const update: Prisma.TenantSubscriptionUpdateInput = {};
  if (stripeCustomerId !== undefined) update.stripeCustomerId = stripeCustomerId;
  if (stripeSubscriptionId !== undefined) update.stripeSubscriptionId = stripeSubscriptionId;
  if (stripePriceId !== undefined) update.stripePriceId = stripePriceId;
  if (planCode !== undefined) update.planCode = planCode;
  if (status !== undefined) update.status = status;
  if (currentPeriodEnd !== undefined) update.currentPeriodEnd = currentPeriodEnd;
  if (cancelAtPeriodEnd !== undefined) update.cancelAtPeriodEnd = cancelAtPeriodEnd;

  const create: Prisma.TenantSubscriptionCreateInput = {
    stripeCustomerId: stripeCustomerId ?? null,
    stripeSubscriptionId: stripeSubscriptionId ?? null,
    stripePriceId: stripePriceId ?? null,
    planCode: planCode ?? "free",
    status: status ?? "inactive",
    currentPeriodEnd: currentPeriodEnd ?? null,
    cancelAtPeriodEnd: cancelAtPeriodEnd ?? false,
    user: { connect: { id: tenantId } },
  };

  return prisma.tenantSubscription.upsert({
    where: { tenantId },
    create,
    update,
  });
}

export async function updateSubscriptionStatus(
  stripeSubscriptionId: string,
  updates: Prisma.TenantSubscriptionUpdateInput
) {
  const result = await prisma.tenantSubscription.updateMany({
    where: { stripeSubscriptionId },
    data: { ...updates, updatedAt: new Date() },
  });
  return result.count;
}

export async function findByStripeSubscriptionId(stripeSubscriptionId: string) {
  return prisma.tenantSubscription.findFirst({
    where: { stripeSubscriptionId },
  });
}

export async function findByTenantId(tenantId: string) {
  return prisma.tenantSubscription.findUnique({
    where: { tenantId },
  });
}
