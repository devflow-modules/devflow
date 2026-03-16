/**
 * Persistência do perfil de billing do usuário (tabela UserBillingProfile).
 * Armazena IDs do Stripe (customer, subscription) para integração com Customer Portal.
 * Não substitui UserPlan — UserPlan é a fonte do plano atual.
 */

import { prisma } from "@/modules/financeiro/lib/db";

export type BillingProfile = {
  id: string;
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function getByUserId(userId: string): Promise<BillingProfile | null> {
  return prisma.userBillingProfile.findUnique({ where: { userId } });
}

export async function upsertProfile(
  userId: string,
  stripeCustomerId: string,
  stripeSubscriptionId?: string
): Promise<BillingProfile> {
  return prisma.userBillingProfile.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId,
      stripeSubscriptionId: stripeSubscriptionId ?? null,
    },
    update: {
      stripeCustomerId,
      ...(stripeSubscriptionId !== undefined && { stripeSubscriptionId }),
      updatedAt: new Date(),
    },
  });
}

export async function updateSubscriptionId(
  userId: string,
  stripeSubscriptionId: string
): Promise<void> {
  await prisma.userBillingProfile.updateMany({
    where: { userId },
    data: { stripeSubscriptionId, updatedAt: new Date() },
  });
}

export async function clearSubscriptionId(userId: string): Promise<void> {
  await prisma.userBillingProfile.updateMany({
    where: { userId },
    data: { stripeSubscriptionId: null, updatedAt: new Date() },
  });
}
