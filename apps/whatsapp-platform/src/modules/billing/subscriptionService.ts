/**
 * Obtém o plano efetivo do tenant.
 * Prioridade: TenantSubscription > BillingSubscription > Tenant.plan > FREE
 */

import { prisma } from "@/lib/prisma";
import { normalizePlan } from "./plans";
import type { PlanKey } from "./plans";
import { getTenantPlanCapabilities, type PlanCapabilities } from "./planCapabilities";

export async function getTenantPlan(tenantId: string): Promise<PlanKey> {
  const [tenantSub, billingSub, tenant] = await Promise.all([
    prisma.tenantSubscription.findUnique({
      where: { tenantId },
      select: { plan: true, status: true },
    }),
    prisma.billingSubscription.findUnique({
      where: { tenantId },
      select: { plan: true, status: true },
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true },
    }),
  ]);

  if (tenantSub?.status && !["CANCELED", "PAST_DUE"].includes(tenantSub.status)) {
    return normalizePlan(tenantSub.plan) as PlanKey;
  }
  if (billingSub?.plan) return normalizePlan(billingSub.plan) as PlanKey;
  return normalizePlan(tenant?.plan) as PlanKey;
}

/** Plano normalizado + capabilities — fonte única para enforcement e UI de limites. */
export async function getTenantBillingContext(tenantId: string): Promise<{
  plan: PlanKey;
  capabilities: PlanCapabilities;
}> {
  const plan = await getTenantPlan(tenantId);
  return { plan, capabilities: getTenantPlanCapabilities(plan) };
}

export async function ensureTenantSubscription(
  tenantId: string,
  plan: PlanKey,
  status = "ACTIVE"
): Promise<void> {
  await prisma.tenantSubscription.upsert({
    where: { tenantId },
    create: {
      tenantId,
      plan,
      status,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    update: { plan, status, updatedAt: new Date() },
  });
}
