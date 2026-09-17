import { describe, expect, it } from "vitest";

import { CAREER_ANALYTICS_DISCLAIMER, CAREER_ANALYTICS_HINT, CAREER_ANALYTICS_TABS } from "./career-analytics-content";

describe("career-analytics-content", () => {
  it("não promete auto-submit nem causalidade", () => {
    expect(CAREER_ANALYTICS_HINT.toLowerCase()).toContain("não envia");
    expect(CAREER_ANALYTICS_HINT.toLowerCase()).toContain("não estabelece causalidade");
    expect(CAREER_ANALYTICS_DISCLAIMER).toContain("does not establish causality");
    expect(CAREER_ANALYTICS_TABS.history).toBe("Histórico");
  });
});
