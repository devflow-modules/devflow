import { describe, expect, it } from "vitest";

import { isApplyFlowSupportedLinkedInPage } from "./linkedin-page-guard.js";

describe("isApplyFlowSupportedLinkedInPage", () => {
  it("aceita rotas /jobs", () => {
    expect(isApplyFlowSupportedLinkedInPage("https://www.linkedin.com/jobs/")).toBe(true);
    expect(
      isApplyFlowSupportedLinkedInPage("https://www.linkedin.com/jobs/view/1234567890/"),
    ).toBe(true);
    expect(
      isApplyFlowSupportedLinkedInPage("https://www.linkedin.com/jobs/search/?keywords=react"),
    ).toBe(true);
    expect(isApplyFlowSupportedLinkedInPage("https://www.linkedin.com/jobs")).toBe(true);
  });

  it("rejeita /notifications, feed e home", () => {
    expect(
      isApplyFlowSupportedLinkedInPage("https://www.linkedin.com/notifications/?filter=all"),
    ).toBe(false);
    expect(isApplyFlowSupportedLinkedInPage("https://www.linkedin.com/feed/")).toBe(false);
    expect(isApplyFlowSupportedLinkedInPage("https://www.linkedin.com/in/example/")).toBe(false);
    expect(isApplyFlowSupportedLinkedInPage("https://www.linkedin.com/")).toBe(false);
  });
});
