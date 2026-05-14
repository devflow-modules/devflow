import { describe, expect, it } from "vitest";
import { coachingUnavailableMessage } from "./aiResumeCoachingFallback";

describe("coachingUnavailableMessage", () => {
  it("blocks when OpenAI preference is off", () => {
    expect(coachingUnavailableMessage({ preferOpenAi: false, openAiApiKey: "sk-x" })).not.toBeNull();
  });

  it("blocks when preference on but key missing", () => {
    expect(coachingUnavailableMessage({ preferOpenAi: true, openAiApiKey: null })).not.toBeNull();
  });

  it("allows when preference on and key present", () => {
    expect(coachingUnavailableMessage({ preferOpenAi: true, openAiApiKey: "sk-test" })).toBeNull();
  });
});
