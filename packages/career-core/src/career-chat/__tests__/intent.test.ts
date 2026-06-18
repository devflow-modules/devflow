import { describe, expect, it } from "vitest";
import { resolveCareerChatIntent } from "../intent.js";
import { normalizeCareerChatRequest } from "../normalize.js";
import { createSampleLibreChatBody } from "./fixtures.js";

describe("career chat intent mapping", () => {
  it("maps application fit", () => {
    expect(resolveCareerChatIntent("analyze_application_fit").ok).toBe(true);
    const normalized = normalizeCareerChatRequest({
      provider: "librechat",
      body: createSampleLibreChatBody({ action: "analyze_application_fit" }),
    });
    expect(normalized.ok && normalized.value.action).toBe("analyze_application_fit");
  });

  it("maps profile gaps", () => {
    const normalized = normalizeCareerChatRequest({
      provider: "librechat",
      body: createSampleLibreChatBody({ action: "analyze_profile_gaps" }),
    });
    expect(normalized.ok && normalized.value.action).toBe("analyze_profile_gaps");
  });

  it("maps interview prep", () => {
    const normalized = normalizeCareerChatRequest({
      provider: "librechat",
      body: createSampleLibreChatBody({ action: "prepare_interview" }),
    });
    expect(normalized.ok && normalized.value.action).toBe("prepare_interview");
  });

  it("blocks missing intent", () => {
    expect(resolveCareerChatIntent(undefined).ok).toBe(false);
  });

  it("blocks invalid intent", () => {
    expect(resolveCareerChatIntent("submit_application").ok).toBe(false);
  });
});
