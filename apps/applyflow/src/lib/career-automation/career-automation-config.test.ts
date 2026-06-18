import { describe, expect, it } from "vitest";
import {
  probeCareerAutomationReachable,
  resolveCareerAutomationProvider,
  resolveCareerAutomationProviderConfig,
  resolveOpenClawTimeoutMs,
} from "./career-automation-boundary";

describe("career-automation provider config", () => {
  it("defaults to mock and never silently falls back from openclaw", () => {
    expect(resolveCareerAutomationProvider({})).toBe("mock");
    expect(resolveCareerAutomationProvider({ CAREER_AUTOMATION_PROVIDER: "openclaw" })).toBe("openclaw");
    expect(resolveCareerAutomationProvider({ CAREER_AUTOMATION_PROVIDER: "bogus" })).toBe("mock");
  });

  it("marks openclaw configured only with enabled flag, key and base url", () => {
    expect(
      resolveCareerAutomationProviderConfig({
        CAREER_AUTOMATION_PROVIDER: "openclaw",
        OPENCLAW_ENABLED: "true",
        OPENCLAW_API_KEY: "k",
        OPENCLAW_BASE_URL: "https://x",
      }).configured,
    ).toBe(true);

    expect(
      resolveCareerAutomationProviderConfig({
        CAREER_AUTOMATION_PROVIDER: "openclaw",
        OPENCLAW_ENABLED: "false",
        OPENCLAW_API_KEY: "k",
        OPENCLAW_BASE_URL: "https://x",
      }).configured,
    ).toBe(false);

    expect(
      resolveCareerAutomationProviderConfig({
        CAREER_AUTOMATION_PROVIDER: "openclaw",
        OPENCLAW_ENABLED: "true",
        OPENCLAW_BASE_URL: "https://x",
      }).configured,
    ).toBe(false);
  });

  it("bounds the openclaw timeout and falls back on invalid input", () => {
    expect(resolveOpenClawTimeoutMs({})).toBe(10000);
    expect(resolveOpenClawTimeoutMs({ OPENCLAW_TIMEOUT_MS: "abc" })).toBe(10000);
    expect(resolveOpenClawTimeoutMs({ OPENCLAW_TIMEOUT_MS: "5000" })).toBe(5000);
    expect(resolveOpenClawTimeoutMs({ OPENCLAW_TIMEOUT_MS: "1" })).toBe(1000);
    expect(resolveOpenClawTimeoutMs({ OPENCLAW_TIMEOUT_MS: "999999" })).toBe(60000);
  });

  it("probes mock as reachable without any network call", async () => {
    const fetchImpl = (() => Promise.reject(new Error("should not be called"))) as unknown as typeof fetch;
    await expect(
      probeCareerAutomationReachable({ CAREER_AUTOMATION_PROVIDER: "mock" }, fetchImpl),
    ).resolves.toBe(true);
  });

  it("returns false for an unconfigured openclaw probe without a network call", async () => {
    const fetchImpl = (() => Promise.reject(new Error("should not be called"))) as unknown as typeof fetch;
    await expect(
      probeCareerAutomationReachable({ CAREER_AUTOMATION_PROVIDER: "openclaw" }, fetchImpl),
    ).resolves.toBe(false);
  });
});
