import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  calculateMRR,
  calculateARR,
  getPlanDistribution,
  calculateUpgradeRate,
  calculateChurn,
  calculateARPU,
  getRevenueMetrics,
} from "../RevenueService";
import { prisma } from "@/modules/financeiro/lib/db";
import * as growthMetrics from "@/analytics/growth/growthMetrics";

vi.mock("@/modules/financeiro/lib/db", () => ({
  prisma: {
    userPlan: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/analytics/growth/growthMetrics", () => ({
  getCounters: vi.fn(),
}));

type UserPlanRow = { planId: string };

function mockPlans(plans: UserPlanRow[]) {
  vi.mocked(prisma.userPlan.findMany).mockResolvedValue(
    plans.map((p, i) => ({
      id: `plan-${i}`,
      userId: `user-${i}`,
      planId: p.planId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  );
}

function mockCounters(counters: Record<string, number>) {
  vi.mocked(growthMetrics.getCounters).mockReturnValue(counters);
}

describe("RevenueService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlans([]);
    mockCounters({});
  });

  // -------------------------------------------------------------------------
  // MRR
  // -------------------------------------------------------------------------
  describe("calculateMRR", () => {
    it("retorna zero quando não há assinantes pagos", async () => {
      mockPlans([{ planId: "FREE" }, { planId: "FREE" }]);
      const result = await calculateMRR();
      expect(result.totalMRR).toBe(0);
      expect(result.proMRR).toBe(0);
      expect(result.teamMRR).toBe(0);
    });

    it("calcula MRR corretamente para PRO e TEAM", async () => {
      mockPlans([{ planId: "PRO" }, { planId: "PRO" }, { planId: "TEAM" }]);
      const result = await calculateMRR();
      expect(result.proMRR).toBe(58); // 2 × 29
      expect(result.teamMRR).toBe(79); // 1 × 79
      expect(result.totalMRR).toBe(137);
    });

    it("calcula ARR como MRR × 12", async () => {
      mockPlans([{ planId: "PRO" }]);
      const result = await calculateMRR();
      expect(result.totalARR).toBe(result.totalMRR * 12);
      expect(result.proARR).toBe(result.proMRR * 12);
    });

    it("ignora planos FREE no cálculo de receita", async () => {
      mockPlans([
        { planId: "FREE" },
        { planId: "FREE" },
        { planId: "FREE" },
        { planId: "PRO" },
      ]);
      const result = await calculateMRR();
      expect(result.totalMRR).toBe(29);
    });
  });

  // -------------------------------------------------------------------------
  // ARR
  // -------------------------------------------------------------------------
  describe("calculateARR", () => {
    it("retorna MRR × 12", async () => {
      mockPlans([{ planId: "PRO" }, { planId: "TEAM" }]);
      const arr = await calculateARR();
      expect(arr).toBe((29 + 79) * 12);
    });
  });

  // -------------------------------------------------------------------------
  // Plan distribution
  // -------------------------------------------------------------------------
  describe("getPlanDistribution", () => {
    it("conta usuários por plano corretamente", async () => {
      mockPlans([
        { planId: "FREE" },
        { planId: "PRO" },
        { planId: "PRO" },
        { planId: "TEAM" },
      ]);
      const result = await getPlanDistribution();
      expect(result.freeUsers).toBe(1);
      expect(result.proUsers).toBe(2);
      expect(result.teamUsers).toBe(1);
      expect(result.totalUsers).toBe(4);
      expect(result.totalPaid).toBe(3);
    });

    it("retorna zeros quando não há usuários", async () => {
      mockPlans([]);
      const result = await getPlanDistribution();
      expect(result.totalUsers).toBe(0);
      expect(result.totalPaid).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Upgrade rate
  // -------------------------------------------------------------------------
  describe("calculateUpgradeRate", () => {
    it("retorna 0 quando não há visualizações de plano", () => {
      const rate = calculateUpgradeRate({
        paymentsCompleted: 5,
        cancellations: 0,
        planViews: 0,
        upgradeClicks: 0,
      });
      expect(rate).toBe(0);
    });

    it("calcula percentual corretamente", () => {
      const rate = calculateUpgradeRate({
        paymentsCompleted: 10,
        cancellations: 0,
        planViews: 100,
        upgradeClicks: 0,
      });
      expect(rate).toBe(10);
    });

    it("arredonda para 2 casas decimais", () => {
      const rate = calculateUpgradeRate({
        paymentsCompleted: 1,
        cancellations: 0,
        planViews: 3,
        upgradeClicks: 0,
      });
      expect(rate).toBe(33.33);
    });
  });

  // -------------------------------------------------------------------------
  // Churn
  // -------------------------------------------------------------------------
  describe("calculateChurn", () => {
    it("retorna 0 quando não há cancelamentos", () => {
      const churn = calculateChurn(
        { paymentsCompleted: 0, cancellations: 0, planViews: 0, upgradeClicks: 0 },
        10,
      );
      expect(churn).toBe(0);
    });

    it("retorna 0 quando base é zero", () => {
      const churn = calculateChurn(
        { paymentsCompleted: 0, cancellations: 0, planViews: 0, upgradeClicks: 0 },
        0,
      );
      expect(churn).toBe(0);
    });

    it("calcula churn rate corretamente", () => {
      const churn = calculateChurn(
        { paymentsCompleted: 0, cancellations: 2, planViews: 0, upgradeClicks: 0 },
        8,
      );
      // cancellations / (totalPaid + cancellations) = 2 / 10 = 20%
      expect(churn).toBe(20);
    });
  });

  // -------------------------------------------------------------------------
  // ARPU
  // -------------------------------------------------------------------------
  describe("calculateARPU", () => {
    it("retorna 0 quando não há usuários", () => {
      expect(calculateARPU(100, 0)).toBe(0);
    });

    it("calcula ARPU corretamente", () => {
      expect(calculateARPU(290, 10)).toBe(29);
    });

    it("arredonda para 2 casas decimais", () => {
      expect(calculateARPU(100, 3)).toBe(33.33);
    });
  });

  // -------------------------------------------------------------------------
  // getRevenueMetrics (aggregador)
  // -------------------------------------------------------------------------
  describe("getRevenueMetrics", () => {
    it("retorna objeto completo com todos os campos", async () => {
      mockPlans([{ planId: "PRO" }, { planId: "TEAM" }, { planId: "FREE" }]);
      mockCounters({
        "devflow.billing.payment_completed": 3,
        "devflow.billing.subscription_cancelled": 1,
        "devflow.billing.plan_viewed": 50,
        "devflow.billing.upgrade_clicked": 10,
      });

      const metrics = await getRevenueMetrics();

      expect(metrics.totalMRR).toBe(108); // 29 + 79
      expect(metrics.totalARR).toBe(108 * 12);
      expect(metrics.planDistribution.freeUsers).toBe(1);
      expect(metrics.planDistribution.proUsers).toBe(1);
      expect(metrics.planDistribution.teamUsers).toBe(1);
      expect(metrics.planDistribution.totalPaid).toBe(2);
      expect(metrics.upgradeRate).toBe(6); // 3/50 × 100
      expect(metrics.churnRate).toBe(33.33); // 1/(2+1) × 100
      expect(metrics.arpu).toBe(36); // 108/3
    });
  });
});
