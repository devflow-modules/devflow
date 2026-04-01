import { describe, it, expect, beforeEach } from "vitest";
import {
  trackToolUsage,
  trackFeatureUsage,
  trackConversion,
  trackFunnelFirst,
  resetFunnelState,
} from "@/modules/financeiro/adapters/productAnalytics";
import { getCounters, resetMetrics } from "@/modules/financeiro/adapters/metrics/financeMetrics";

describe("financeProductAnalytics", () => {
  beforeEach(() => {
    resetMetrics();
    resetFunnelState();
  });

  describe("trackToolUsage", () => {
    it("deve incrementar métrica finance.tool.expenses.usage", () => {
      trackToolUsage("expenses", { userId: "u1", householdId: "h1" });

      const counters = getCounters();
      expect(counters["finance.tool.expenses.usage"]).toBe(1);
    });

    it("deve incrementar métrica finance.tool.incomes.usage", () => {
      trackToolUsage("incomes", { userId: "u1", householdId: "h1" });
      trackToolUsage("incomes", { userId: "u1", householdId: "h1" });

      const counters = getCounters();
      expect(counters["finance.tool.incomes.usage"]).toBe(2);
    });

    it("deve aceitar toolName não mapeado e usar padrão finance.tool.<name>.usage", () => {
      trackToolUsage("custom-tool", { userId: "u1", householdId: "h1" });

      const counters = getCounters();
      expect(counters["finance.tool.custom-tool.usage"]).toBe(1);
    });
  });

  describe("trackFeatureUsage", () => {
    it("deve incrementar métrica para rules.create", () => {
      trackFeatureUsage("rules.create", { userId: "u1", householdId: "h1" });

      const counters = getCounters();
      expect(counters["finance.feature.rules.created"]).toBe(1);
    });

    it("deve incrementar métrica para household.invite", () => {
      trackFeatureUsage("household.invite", { userId: "u1", householdId: "h1" });

      const counters = getCounters();
      expect(counters["finance.household.invites.sent"]).toBe(1);
    });

    it("deve incrementar métrica para household.transfer", () => {
      trackFeatureUsage("household.transfer", { userId: "u1", householdId: "h1" });

      const counters = getCounters();
      expect(counters["finance.household.transfer.usage"]).toBe(1);
    });
  });

  describe("trackConversion", () => {
    it("deve incrementar métrica finance.conversion.* para o evento", () => {
      trackConversion("finance.funnel.first_expense_created", {
        userId: "u1",
        householdId: "h1",
      });

      const counters = getCounters();
      expect(
        counters["finance.conversion.finance_funnel_first_expense_created"]
      ).toBe(1);
    });
  });

  describe("trackFunnelFirst", () => {
    it("deve incrementar conversão na primeira chamada e retornar true", () => {
      const first = trackFunnelFirst("finance.funnel.first_expense_created", {
        userId: "u1",
        householdId: "h1",
      });

      expect(first).toBe(true);
      const counters = getCounters();
      expect(
        counters["finance.conversion.finance_funnel_first_expense_created"]
      ).toBe(1);
    });

    it("deve ignorar segunda chamada para mesmo household+evento e retornar false", () => {
      trackFunnelFirst("finance.funnel.first_expense_created", {
        userId: "u1",
        householdId: "h1",
      });
      const second = trackFunnelFirst("finance.funnel.first_expense_created", {
        userId: "u1",
        householdId: "h1",
      });

      expect(second).toBe(false);
      const counters = getCounters();
      expect(
        counters["finance.conversion.finance_funnel_first_expense_created"]
      ).toBe(1);
    });

    it("deve emitir para household diferente", () => {
      trackFunnelFirst("finance.funnel.first_expense_created", {
        userId: "u1",
        householdId: "h1",
      });
      const other = trackFunnelFirst("finance.funnel.first_expense_created", {
        userId: "u2",
        householdId: "h2",
      });

      expect(other).toBe(true);
      const counters = getCounters();
      expect(
        counters["finance.conversion.finance_funnel_first_expense_created"]
      ).toBe(2);
    });
  });
});
