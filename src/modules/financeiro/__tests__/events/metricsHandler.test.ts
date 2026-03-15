import { describe, it, expect, beforeEach } from "vitest";
import { getCounters, resetMetrics } from "@/modules/financeiro/adapters/metrics/financeMetrics";
import { emit } from "@/modules/financeiro/events";

describe("metricsHandler (event → métricas)", () => {
  beforeEach(() => {
    resetMetrics();
  });

  it("deve incrementar finance.expenses.created.count ao emitir finance.expense.created", () => {
    emit("finance.expense.created", { householdId: "h1", userId: "u1", entityId: "e1" });
    emit("finance.expense.created", { householdId: "h1", userId: "u1", entityId: "e2" });

    const counters = getCounters();
    expect(counters["finance.expenses.created.count"]).toBe(2);
  });

  it("deve incrementar finance.incomes.created.count ao emitir finance.income.created", () => {
    emit("finance.income.created", { householdId: "h1", entityId: "inc-1" });

    const counters = getCounters();
    expect(counters["finance.incomes.created.count"]).toBe(1);
  });

  it("deve incrementar finance.households.transfer.count ao emitir finance.household.transfer", () => {
    emit("finance.household.transfer", { householdId: "h1", entityId: "m1" });

    const counters = getCounters();
    expect(counters["finance.households.transfer.count"]).toBe(1);
  });

  it("deve incrementar finance.invites.sent.count ao emitir finance.invite.sent", () => {
    emit("finance.invite.sent", { householdId: "h1", entityId: "inv-1" });

    const counters = getCounters();
    expect(counters["finance.invites.sent.count"]).toBe(1);
  });

  it("deve incrementar finance.households.members.removed.count ao emitir finance.household.member_removed", () => {
    emit("finance.household.member_removed", { householdId: "h1", entityId: "mem-1" });

    const counters = getCounters();
    expect(counters["finance.households.members.removed.count"]).toBe(1);
  });
});
