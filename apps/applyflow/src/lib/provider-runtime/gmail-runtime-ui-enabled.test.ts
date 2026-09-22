import { describe, expect, it } from "vitest";
import { isApplyFlowGmailRuntimeEnabled } from "./gmail-runtime-ui-enabled";

describe("isApplyFlowGmailRuntimeEnabled", () => {
  it("fica desligado quando qualquer flag Gmail falta", () => {
    expect(isApplyFlowGmailRuntimeEnabled({})).toBe(false);
    expect(
      isApplyFlowGmailRuntimeEnabled({
        CAREER_PROVIDER_RUNTIME_ENABLED: "true",
        NANGO_RUNTIME_ENABLED: "true",
      }),
    ).toBe(false);
  });

  it("liga só com as três flags Gmail", () => {
    expect(
      isApplyFlowGmailRuntimeEnabled({
        CAREER_PROVIDER_RUNTIME_ENABLED: "true",
        NANGO_RUNTIME_ENABLED: "true",
        GMAIL_PROVIDER_ENABLED: "true",
      }),
    ).toBe(true);
  });
});
