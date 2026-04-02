/**
 * Revenue Analytics — cálculo de MRR, ARR, ARPU, churn e distribuição de planos.
 *
 * Fonte de dados:
 *   - tabela UserPlan (via Prisma) para planos ativos
 *   - growthMetrics (em memória) para eventos de billing
 */

import { prisma } from "@/lib/prisma-root";
import { getCounters } from "@/analytics/growth/growthMetrics";
import { PLAN_PRICE } from "./revenuePlans";
import type {
  PlanRevenue,
  PlanDistribution,
  RevenueMetrics,
  SubscriptionMetrics,
} from "./revenueTypes";

// ---------------------------------------------------------------------------
// FASE 2 — MRR
// ---------------------------------------------------------------------------

export async function calculateMRR(): Promise<PlanRevenue> {
  const rows = await prisma.userPlan.findMany({ select: { planId: true } });

  let proUsers = 0;
  let teamUsers = 0;

  for (const row of rows) {
    if (row.planId === "PRO") proUsers++;
    else if (row.planId === "TEAM") teamUsers++;
  }

  const proMRR = proUsers * PLAN_PRICE.PRO;
  const teamMRR = teamUsers * PLAN_PRICE.TEAM;
  const totalMRR = proMRR + teamMRR;

  return {
    totalMRR,
    proMRR,
    teamMRR,
    totalARR: totalMRR * 12,
    proARR: proMRR * 12,
    teamARR: teamMRR * 12,
  };
}

// ---------------------------------------------------------------------------
// FASE 3 — ARR (derivado do MRR)
// ---------------------------------------------------------------------------

export async function calculateARR(): Promise<number> {
  const { totalMRR } = await calculateMRR();
  return totalMRR * 12;
}

// ---------------------------------------------------------------------------
// FASE 4 — Distribuição de planos
// ---------------------------------------------------------------------------

export async function getPlanDistribution(): Promise<PlanDistribution> {
  const rows = await prisma.userPlan.findMany({ select: { planId: true } });

  let freeUsers = 0;
  let proUsers = 0;
  let teamUsers = 0;

  for (const row of rows) {
    if (row.planId === "PRO") proUsers++;
    else if (row.planId === "TEAM") teamUsers++;
    else freeUsers++;
  }

  const totalUsers = freeUsers + proUsers + teamUsers;
  const totalPaid = proUsers + teamUsers;

  return { freeUsers, proUsers, teamUsers, totalUsers, totalPaid };
}

// ---------------------------------------------------------------------------
// FASE 5 — Upgrade rate
// ---------------------------------------------------------------------------

export function calculateUpgradeRate(metrics: SubscriptionMetrics): number {
  const { paymentsCompleted, planViews } = metrics;
  if (planViews === 0) return 0;
  return Number(((paymentsCompleted / planViews) * 100).toFixed(2));
}

// ---------------------------------------------------------------------------
// FASE 6 — Churn
// ---------------------------------------------------------------------------

export function calculateChurn(metrics: SubscriptionMetrics, totalPaid: number): number {
  const { cancellations } = metrics;
  const base = totalPaid + cancellations;
  if (base === 0) return 0;
  return Number(((cancellations / base) * 100).toFixed(2));
}

// ---------------------------------------------------------------------------
// FASE 7 — ARPU
// ---------------------------------------------------------------------------

export function calculateARPU(totalMRR: number, totalUsers: number): number {
  if (totalUsers === 0) return 0;
  return Number((totalMRR / totalUsers).toFixed(2));
}

// ---------------------------------------------------------------------------
// Helper: ler métricas de billing dos contadores em memória
// ---------------------------------------------------------------------------

export function getSubscriptionMetrics(): SubscriptionMetrics {
  const counters = getCounters();
  return {
    paymentsCompleted: counters["devflow.billing.payment_completed"] ?? 0,
    cancellations: counters["devflow.billing.subscription_cancelled"] ?? 0,
    planViews: counters["devflow.billing.plan_viewed"] ?? 0,
    upgradeClicks: counters["devflow.billing.upgrade_clicked"] ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Agregador principal
// ---------------------------------------------------------------------------

export async function getRevenueMetrics(): Promise<RevenueMetrics> {
  const [mrr, planDistribution] = await Promise.all([
    calculateMRR(),
    getPlanDistribution(),
  ]);

  const subscriptionMetrics = getSubscriptionMetrics();

  const arpu = calculateARPU(mrr.totalMRR, planDistribution.totalUsers);
  const churnRate = calculateChurn(subscriptionMetrics, planDistribution.totalPaid);
  const upgradeRate = calculateUpgradeRate(subscriptionMetrics);

  return {
    ...mrr,
    planDistribution,
    arpu,
    churnRate,
    upgradeRate,
  };
}
