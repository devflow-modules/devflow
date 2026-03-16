/**
 * Tipos do módulo de revenue analytics.
 */

export type PlanRevenue = {
  totalMRR: number;
  proMRR: number;
  teamMRR: number;
  totalARR: number;
  proARR: number;
  teamARR: number;
};

export type PlanDistribution = {
  freeUsers: number;
  proUsers: number;
  teamUsers: number;
  totalUsers: number;
  totalPaid: number;
};

export type RevenueMetrics = PlanRevenue & {
  planDistribution: PlanDistribution;
  arpu: number;
  churnRate: number;
  upgradeRate: number;
};

export type SubscriptionMetrics = {
  paymentsCompleted: number;
  cancellations: number;
  planViews: number;
  upgradeClicks: number;
};
