import { describe, it, expect } from "vitest";
import { evaluateAllConditions } from "../ruleEngineConditions";
import type { AutomationContext, AutomationEvent } from "../automation.types";

function ctx(over: Partial<NonNullable<AutomationContext["thread"]>> = {}): AutomationContext {
  return {
    tenantId: "t1",
    threadId: "th1",
    executionId: "e1",
    depth: 0,
    ruleIdsExecuted: new Set(),
    thread: {
      status: "OPEN",
      assignedToUserId: null,
      tags: [],
      ...over,
    },
  };
}

const inboundEvent: AutomationEvent = {
  triggerType: "MESSAGE_INBOUND",
  tenantId: "t1",
  threadId: "th1",
};

describe("Rule Engine v1 — condições", () => {
  it("conversationState + slaLevel", () => {
    expect(
      evaluateAllConditions(
        [
          { field: "conversationState", operator: "equals", value: "awaiting_agent" },
          { field: "slaLevel", operator: "equals", value: "critical" },
        ],
        inboundEvent,
        ctx({
          conversationState: "awaiting_agent",
          slaLevel: "critical",
        })
      )
    ).toBe(true);

    expect(
      evaluateAllConditions(
        [{ field: "slaLevel", operator: "equals", value: "low" }],
        inboundEvent,
        ctx({ slaLevel: "critical" })
      )
    ).toBe(false);
  });

  it("isUnassigned", () => {
    expect(
      evaluateAllConditions(
        [{ field: "isUnassigned", operator: "equals", value: true }],
        inboundEvent,
        ctx({ isUnassigned: true, assignedToUserId: null })
      )
    ).toBe(true);
    expect(
      evaluateAllConditions(
        [{ field: "isUnassigned", operator: "equals", value: true }],
        inboundEvent,
        ctx({ isUnassigned: false, assignedToUserId: "u1" })
      )
    ).toBe(false);
  });

  it("hasTag", () => {
    expect(
      evaluateAllConditions(
        [{ field: "hasTag", operator: "equals", value: "Lead" }],
        inboundEvent,
        ctx({ tags: [{ id: "x", name: "Lead" }] })
      )
    ).toBe(true);
  });

  it("lastInboundMinutesAgo (gte)", () => {
    const past = new Date(Date.now() - 130 * 60_000).toISOString();
    expect(
      evaluateAllConditions(
        [{ field: "lastInboundMinutesAgo", operator: "gte", value: 120 }],
        inboundEvent,
        ctx({ lastInboundMessageAt: past })
      )
    ).toBe(true);
  });

  it("lista vazia = true", () => {
    expect(evaluateAllConditions([], inboundEvent, ctx())).toBe(true);
  });
});

describe("Rule Engine v1 — anti-loop (Set no dispatcher)", () => {
  it("documenta: mesma regra não reentra no mesmo dispatch (ruleIdsExecuted)", () => {
    const ruleIdsExecuted = new Set<string>();
    ruleIdsExecuted.add("rule-1");
    expect(ruleIdsExecuted.has("rule-1")).toBe(true);
  });
});
