import { describe, it, expect, beforeEach } from "vitest";
import {
  trackVisitor,
  trackSimulatorUsage,
  trackLeadSubmission,
  trackSignupStarted,
  trackSignupCompleted,
  trackHouseholdCreated,
  trackFirstExpenseCreated,
  trackFirstIncomeCreated,
  trackFirstRuleCreated,
} from "@/analytics/growth/growthAnalytics";
import { getCounters, resetGrowthMetrics } from "@/analytics/growth/growthMetrics";

describe("growthAnalytics", () => {
  beforeEach(() => {
    resetGrowthMetrics();
  });

  it("trackVisitor deve incrementar devflow.visitors.count", () => {
    trackVisitor({ sessionId: "s1", householdId: "h1" });
    trackVisitor({ sessionId: "s2" });

    const c = getCounters();
    expect(c["devflow.visitors.count"]).toBe(2);
  });

  it("trackSimulatorUsage deve incrementar devflow.simulator.usage", () => {
    trackSimulatorUsage({ sessionId: "s1" });

    const c = getCounters();
    expect(c["devflow.simulator.usage"]).toBe(1);
  });

  it("trackLeadSubmission deve incrementar devflow.leads.submitted", () => {
    trackLeadSubmission({ sessionId: "s1", source: "simulator" });

    const c = getCounters();
    expect(c["devflow.leads.submitted"]).toBe(1);
  });

  it("trackSignupStarted deve incrementar devflow.signup.started", () => {
    trackSignupStarted({ sessionId: "s1" });

    const c = getCounters();
    expect(c["devflow.signup.started"]).toBe(1);
  });

  it("trackSignupCompleted deve incrementar devflow.signup.completed", () => {
    trackSignupCompleted({ sessionId: "s1", userId: "u1" });

    const c = getCounters();
    expect(c["devflow.signup.completed"]).toBe(1);
  });

  it("trackHouseholdCreated deve incrementar devflow.households.created", () => {
    trackHouseholdCreated({ userId: "u1", householdId: "h1" });

    const c = getCounters();
    expect(c["devflow.households.created"]).toBe(1);
  });

  it("trackFirstExpenseCreated deve incrementar devflow.activation.expense", () => {
    trackFirstExpenseCreated({ userId: "u1", householdId: "h1" });

    const c = getCounters();
    expect(c["devflow.activation.expense"]).toBe(1);
  });

  it("trackFirstIncomeCreated deve incrementar devflow.activation.income", () => {
    trackFirstIncomeCreated({ userId: "u1", householdId: "h1" });

    const c = getCounters();
    expect(c["devflow.activation.income"]).toBe(1);
  });

  it("trackFirstRuleCreated deve incrementar devflow.activation.rule", () => {
    trackFirstRuleCreated({ userId: "u1", householdId: "h1" });

    const c = getCounters();
    expect(c["devflow.activation.rule"]).toBe(1);
  });
});
