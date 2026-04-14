import { describe, it, expect } from "vitest";
import { ruleRequiresAdvancedAutomation } from "../automationRuleFeatures";

describe("ruleRequiresAdvancedAutomation", () => {
  it("retorna false para regra simples MESSAGE_INBOUND", () => {
    expect(
      ruleRequiresAdvancedAutomation({
        triggerType: "MESSAGE_INBOUND",
        conditions: [],
        actions: [{ type: "assignConversation" }],
      })
    ).toBe(false);
  });

  it("retorna true para TIME_ELAPSED", () => {
    expect(
      ruleRequiresAdvancedAutomation({
        triggerType: "TIME_ELAPSED",
        conditions: [],
        actions: [{ type: "sendMessage" }],
      })
    ).toBe(true);
  });

  it("retorna true para triggerAIResponse", () => {
    expect(
      ruleRequiresAdvancedAutomation({
        triggerType: "MESSAGE_INBOUND",
        conditions: [],
        actions: [{ type: "triggerAIResponse" }],
      })
    ).toBe(true);
  });
});
