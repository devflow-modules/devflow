import { describe, expect, it } from "vitest";
import {
  containsForbiddenCareerAutomationKey,
  isCareerAutomationContextSafe,
  scanCareerAutomationPayloadForForbiddenKeys,
} from "../security.js";

describe("career automation security scanner", () => {
  it.each([
    "access_token",
    "refresh_token",
    "client_secret",
    "authorization",
    "connectionId",
    "messageId",
    "threadId",
    "eventId",
    "subject",
    "snippet",
    "body",
    "command",
    "url",
    "headers",
    "filesystemPath",
    "cron",
    "schedule",
    "retryPolicy",
    "background",
    "callbackUrl",
    "webhookUrl",
    "rawProviderPayload",
    "systemPrompt",
    "developerPrompt",
    "hiddenPrompt",
    "toolRegistry",
    "allowedCapabilities",
    "executionPlan",
  ])("rejects forbidden key %s", (key) => {
    expect(containsForbiddenCareerAutomationKey(key)).toBe(true);
  });

  it("finds nested forbidden keys", () => {
    const hits = scanCareerAutomationPayloadForForbiddenKeys({
      context: { careerBundle: {}, schedule: "*/5 * * * *" },
    });
    expect(hits).toContain("context.schedule");
  });

  it("accepts a safe payload", () => {
    expect(
      scanCareerAutomationPayloadForForbiddenKeys({
        kind: "prepare_interview_plan",
        context: { selectedSignalIds: ["a"] },
      }),
    ).toHaveLength(0);
  });

  it("rejects context with token/raw markers", () => {
    expect(isCareerAutomationContextSafe({ hasToken: true })).toBe(false);
    expect(isCareerAutomationContextSafe({ rawProviderData: true })).toBe(false);
    expect(isCareerAutomationContextSafe({ kind: "x" })).toBe(true);
  });
});
