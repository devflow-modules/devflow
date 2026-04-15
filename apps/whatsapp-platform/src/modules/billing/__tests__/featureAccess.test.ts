import { describe, it, expect } from "vitest";
import { minimumPlanForFeature } from "../featureAccess";

describe("minimumPlanForFeature", () => {
  it("QUEUES_TAGS → OPERATIONAL_BASE", () => {
    expect(minimumPlanForFeature("QUEUES_TAGS")).toBe("OPERATIONAL_BASE");
  });

  it("ADVANCED_AI → OPERATIONAL_BASE", () => {
    expect(minimumPlanForFeature("ADVANCED_AI")).toBe("OPERATIONAL_BASE");
  });

  it("AUTOMATION → OPERATIONAL_BASE", () => {
    expect(minimumPlanForFeature("AUTOMATION")).toBe("OPERATIONAL_BASE");
  });
});
