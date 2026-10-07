import { describe, expect, it } from "vitest";

import {
  isApplyFlowAssistancePage,
  isApplyFlowLocalAssistanceFixture,
  isApplyFlowSupportedLinkedInPage,
} from "./linkedin-page-guard.js";

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

describe("local assistance fixture", () => {
  it("aceita apenas /extension-fixture em 3010/3012", () => {
    expect(isApplyFlowLocalAssistanceFixture("http://127.0.0.1:3012/extension-fixture")).toBe(true);
    expect(isApplyFlowAssistancePage("http://localhost:3010/extension-fixture")).toBe(true);
    expect(isApplyFlowLocalAssistanceFixture("http://127.0.0.1:3012/account")).toBe(false);
    expect(isApplyFlowLocalAssistanceFixture("https://www.linkedin.com/extension-fixture")).toBe(false);
  });
});
