import { describe, it, expect } from "vitest";
import { getUiPlanCapabilities } from "../planUiCapabilities";

describe("getUiPlanCapabilities", () => {
  it("FREE: sem automação, sem filas, IA introdutória", () => {
    const c = getUiPlanCapabilities("FREE");
    expect(c.planKey).toBe("FREE");
    expect(c.hasAutomation).toBe(false);
    expect(c.hasAdvancedAutomation).toBe(false);
    expect(c.hasQueuesAndTags).toBe(false);
    expect(c.hasAiResponse).toBe(true);
    expect(c.hasAdvancedAi).toBe(false);
    expect(c.hasWebhooksApi).toBe(false);
    expect(c.hasAdvancedReports).toBe(false);
    expect(c.hasMultiUser).toBe(false);
    expect(c.limits.users).toBe(1);
  });

  it("STARTER: automação básica, sem filas, sem IA avançada", () => {
    const c = getUiPlanCapabilities("STARTER");
    expect(c.hasAutomation).toBe(true);
    expect(c.hasAdvancedAutomation).toBe(false);
    expect(c.hasQueuesAndTags).toBe(false);
    expect(c.hasAdvancedAi).toBe(false);
    expect(c.hasWebhooksApi).toBe(false);
    expect(c.hasAdvancedReports).toBe(false);
    expect(c.hasMultiUser).toBe(false);
  });

  it("PRO: filas, automação avançada, relatórios, multi-user, sem IA avançada nem API", () => {
    const c = getUiPlanCapabilities("PRO");
    expect(c.hasQueuesAndTags).toBe(true);
    expect(c.hasAdvancedAutomation).toBe(true);
    expect(c.hasAdvancedReports).toBe(true);
    expect(c.hasMultiUser).toBe(true);
    expect(c.hasAdvancedAi).toBe(false);
    expect(c.hasWebhooksApi).toBe(false);
    expect(c.limits.users).toBe(3);
  });

  it("SCALE: IA avançada, API, suporte prioritário", () => {
    const c = getUiPlanCapabilities("SCALE");
    expect(c.hasAdvancedAi).toBe(true);
    expect(c.hasWebhooksApi).toBe(true);
    expect(c.hasPrioritySupport).toBe(true);
    expect(c.limits.phoneNumbers).toBe(3);
    expect(c.limits.users).toBe(10);
  });
});
