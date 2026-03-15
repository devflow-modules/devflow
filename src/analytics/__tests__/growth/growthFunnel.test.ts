import { describe, it, expect, beforeEach } from "vitest";
import { trackFunnelEvent } from "@/analytics/growth/growthFunnel";
import { DEVFLOW_FUNNEL_EVENTS } from "@/analytics/devflowFunnelEvents";
import { getCounters, resetGrowthMetrics } from "@/analytics/growth/growthMetrics";

describe("growthFunnel (trackFunnelEvent)", () => {
  beforeEach(() => {
    resetGrowthMetrics();
  });

  it("deve disparar trackVisitor para visitor_landed", () => {
    trackFunnelEvent(DEVFLOW_FUNNEL_EVENTS.VISITOR_LANDED, { sessionId: "s1" });

    expect(getCounters()["devflow.visitors.count"]).toBe(1);
  });

  it("deve disparar trackLeadSubmission para lead_submitted", () => {
    trackFunnelEvent(DEVFLOW_FUNNEL_EVENTS.LEAD_SUBMITTED, {
      sessionId: "s1",
      source: "simulator",
    });

    expect(getCounters()["devflow.leads.submitted"]).toBe(1);
  });

  it("deve disparar trackSignupStarted para signup_started", () => {
    trackFunnelEvent(DEVFLOW_FUNNEL_EVENTS.SIGNUP_STARTED, { sessionId: "s1" });

    expect(getCounters()["devflow.signup.started"]).toBe(1);
  });

  it("deve disparar trackSignupCompleted para signup_completed", () => {
    trackFunnelEvent(DEVFLOW_FUNNEL_EVENTS.SIGNUP_COMPLETED, {
      sessionId: "s1",
      userId: "u1",
    });

    expect(getCounters()["devflow.signup.completed"]).toBe(1);
  });

  it("deve disparar trackHouseholdCreated para household_created", () => {
    trackFunnelEvent(DEVFLOW_FUNNEL_EVENTS.HOUSEHOLD_CREATED, {
      userId: "u1",
      householdId: "h1",
    });

    expect(getCounters()["devflow.households.created"]).toBe(1);
  });
});
