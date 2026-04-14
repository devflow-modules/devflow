import { describe, it, expect } from "vitest";
import { minimumPlanForFeature } from "../featureAccess";

describe("minimumPlanForFeature", () => {
  it("QUEUES_TAGS → PRO", () => {
    expect(minimumPlanForFeature("QUEUES_TAGS")).toBe("PRO");
  });

  it("ADVANCED_AI → SCALE", () => {
    expect(minimumPlanForFeature("ADVANCED_AI")).toBe("SCALE");
  });

  it("AUTOMATION → STARTER", () => {
    expect(minimumPlanForFeature("AUTOMATION")).toBe("STARTER");
  });
});
