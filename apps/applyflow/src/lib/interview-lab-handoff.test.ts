import { afterEach, describe, expect, it, vi } from "vitest";
import { createCareerBundle } from "@devflow/career-core";
import {
  copyCareerBundleJsonToClipboard,
  DEFAULT_INTERVIEW_LAB_ORIGIN,
  getInterviewLabImportHandoffUrl,
  getInterviewLabImportPostMessageHandoffUrl,
  getInterviewLabImportPostMessagePracticeHandoffUrl,
  getInterviewLabOrigin,
  stringifyCareerBundleJson,
} from "./interview-lab-handoff";

describe("getInterviewLabOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults when env is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_INTERVIEW_LAB_URL", "");
    expect(getInterviewLabOrigin()).toBe(DEFAULT_INTERVIEW_LAB_ORIGIN);
  });

  it("trims trailing slashes from env", () => {
    vi.stubEnv("NEXT_PUBLIC_INTERVIEW_LAB_URL", "https://lab.example.com/");
    expect(getInterviewLabOrigin()).toBe("https://lab.example.com");
  });
});

describe("getInterviewLabImportHandoffUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds import path with from=applyflow", () => {
    vi.stubEnv("NEXT_PUBLIC_INTERVIEW_LAB_URL", "");
    expect(getInterviewLabImportHandoffUrl()).toBe(`${DEFAULT_INTERVIEW_LAB_ORIGIN}/import/applyflow?from=applyflow`);
  });
});

describe("getInterviewLabImportPostMessageHandoffUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("includes handoff=postMessage", () => {
    vi.stubEnv("NEXT_PUBLIC_INTERVIEW_LAB_URL", "");
    expect(getInterviewLabImportPostMessageHandoffUrl()).toContain("handoff=postMessage");
    expect(getInterviewLabImportPostMessageHandoffUrl()).toContain("from=applyflow");
  });
});

describe("getInterviewLabImportPostMessagePracticeHandoffUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("includes intent=practice and postMessage handoff", () => {
    vi.stubEnv("NEXT_PUBLIC_INTERVIEW_LAB_URL", "");
    const u = getInterviewLabImportPostMessagePracticeHandoffUrl();
    expect(u).toContain("intent=practice");
    expect(u).toContain("handoff=postMessage");
    expect(u).toContain("from=applyflow");
  });
});

describe("stringifyCareerBundleJson", () => {
  it("matches pretty-printed JSON", () => {
    const b = createCareerBundle([]);
    expect(stringifyCareerBundleJson(b)).toBe(JSON.stringify(b, null, 2));
  });
});

describe("copyCareerBundleJsonToClipboard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns error when clipboard API is missing", async () => {
    vi.stubGlobal("navigator", { clipboard: undefined } as Navigator);
    const r = await copyCareerBundleJsonToClipboard("{}");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("Export JSON");
  });

  it("returns error when writeText throws", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    } as unknown as Navigator);
    const r = await copyCareerBundleJsonToClipboard("{}");
    expect(r.ok).toBe(false);
  });

  it("returns ok when writeText succeeds", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } } as unknown as Navigator);
    const r = await copyCareerBundleJsonToClipboard('{"x":1}');
    expect(r.ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith('{"x":1}');
  });
});
