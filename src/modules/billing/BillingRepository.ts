/**
 * Persistência do plano do usuário (tabela UserPlan).
 * BillingService usa este repository.
 */

import type { PlanId } from "./plans";
import { prisma } from "@/lib/prisma-root";

export async function getUserPlan(userId: string): Promise<PlanId> {
  const row = await prisma.userPlan.findUnique({
    where: { userId },
  });
  const planId = row?.planId ?? "FREE";
  if (planId !== "FREE" && planId !== "PRO" && planId !== "TEAM") {
    return "FREE";
  }
  return planId as PlanId;
}

export async function setUserPlan(userId: string, planId: PlanId): Promise<void> {
  await prisma.userPlan.upsert({
    where: { userId },
    create: { userId, planId },
    update: { planId, updatedAt: new Date() },
  });
}
