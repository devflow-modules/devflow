import { describe, expect, it } from "vitest";
import {
  canUseCalendarProvider,
  canUseGmailProvider,
  canUseNangoRuntime,
  canUseProviderRuntime,
  evaluateProviderRuntimeFlags,
  readProviderRuntimeFlag,
} from "../src/provider-runtime-flags/flags.js";
import type { ProviderRuntimeFlagMap } from "../src/provider-runtime-flags/types.js";

const ALL_ENABLED: ProviderRuntimeFlagMap = {
  CAREER_PROVIDER_RUNTIME_ENABLED: true,
  NANGO_RUNTIME_ENABLED: true,
  GMAIL_PROVIDER_ENABLED: true,
  CALENDAR_PROVIDER_ENABLED: true,
};

describe("readProviderRuntimeFlag", () => {
  it("returns false for missing flag", () => {
    expect(readProviderRuntimeFlag({}, "CAREER_PROVIDER_RUNTIME_ENABLED")).toBe(false);
  });

  it("returns true for boolean true", () => {
    expect(readProviderRuntimeFlag({ CAREER_PROVIDER_RUNTIME_ENABLED: true }, "CAREER_PROVIDER_RUNTIME_ENABLED")).toBe(
      true,
    );
  });

  it('returns true for string "true"', () => {
    expect(
      readProviderRuntimeFlag({ NANGO_RUNTIME_ENABLED: "true" }, "NANGO_RUNTIME_ENABLED"),
    ).toBe(true);
  });

  it.each([
    ["TRUE", "TRUE"],
    ["1", "1"],
    ["yes", "yes"],
    ["false", "false"],
    ["", ""],
  ] as const)("treats %s as false", (_label, value) => {
    expect(readProviderRuntimeFlag({ GMAIL_PROVIDER_ENABLED: value }, "GMAIL_PROVIDER_ENABLED")).toBe(
      false,
    );
  });

  it("returns false for boolean false", () => {
    expect(readProviderRuntimeFlag({ CALENDAR_PROVIDER_ENABLED: false }, "CALENDAR_PROVIDER_ENABLED")).toBe(
      false,
    );
  });

  it("returns false for null and undefined", () => {
    expect(readProviderRuntimeFlag({ NANGO_RUNTIME_ENABLED: null }, "NANGO_RUNTIME_ENABLED")).toBe(false);
    expect(readProviderRuntimeFlag({ NANGO_RUNTIME_ENABLED: undefined }, "NANGO_RUNTIME_ENABLED")).toBe(
      false,
    );
  });
});

describe("provider runtime gate hierarchy", () => {
  it("global false blocks Nango even when Nango flag is true", () => {
    expect(
      canUseNangoRuntime({
        CAREER_PROVIDER_RUNTIME_ENABLED: false,
        NANGO_RUNTIME_ENABLED: true,
      }),
    ).toBe(false);
  });

  it("global false blocks Gmail even when Gmail flag is true", () => {
    expect(
      canUseGmailProvider({
        CAREER_PROVIDER_RUNTIME_ENABLED: false,
        NANGO_RUNTIME_ENABLED: true,
        GMAIL_PROVIDER_ENABLED: true,
      }),
    ).toBe(false);
  });

  it("global false blocks Calendar even when Calendar flag is true", () => {
    expect(
      canUseCalendarProvider({
        CAREER_PROVIDER_RUNTIME_ENABLED: false,
        NANGO_RUNTIME_ENABLED: true,
        CALENDAR_PROVIDER_ENABLED: true,
      }),
    ).toBe(false);
  });

  it("Nango false blocks Gmail even when global and Gmail are true", () => {
    expect(
      canUseGmailProvider({
        CAREER_PROVIDER_RUNTIME_ENABLED: true,
        NANGO_RUNTIME_ENABLED: false,
        GMAIL_PROVIDER_ENABLED: true,
      }),
    ).toBe(false);
  });

  it("Nango false blocks Calendar even when global and Calendar are true", () => {
    expect(
      canUseCalendarProvider({
        CAREER_PROVIDER_RUNTIME_ENABLED: true,
        NANGO_RUNTIME_ENABLED: false,
        CALENDAR_PROVIDER_ENABLED: true,
      }),
    ).toBe(false);
  });

  it("Gmail true only when global, Nango, and Gmail are true", () => {
    expect(canUseGmailProvider(ALL_ENABLED)).toBe(true);
    expect(
      canUseGmailProvider({
        ...ALL_ENABLED,
        GMAIL_PROVIDER_ENABLED: false,
      }),
    ).toBe(false);
  });

  it("Calendar true only when global, Nango, and Calendar are true", () => {
    expect(canUseCalendarProvider(ALL_ENABLED)).toBe(true);
    expect(
      canUseCalendarProvider({
        ...ALL_ENABLED,
        CALENDAR_PROVIDER_ENABLED: false,
      }),
    ).toBe(false);
  });
});

describe("evaluateProviderRuntimeFlags", () => {
  it("returns all evaluation fields correctly", () => {
    expect(evaluateProviderRuntimeFlags(ALL_ENABLED)).toEqual({
      careerProviderRuntimeEnabled: true,
      nangoRuntimeEnabled: true,
      gmailProviderEnabled: true,
      calendarProviderEnabled: true,
      canUseNangoRuntime: true,
      canUseGmailProvider: true,
      canUseCalendarProvider: true,
    });
  });

  it("returns all false for empty map", () => {
    expect(evaluateProviderRuntimeFlags({})).toEqual({
      careerProviderRuntimeEnabled: false,
      nangoRuntimeEnabled: false,
      gmailProviderEnabled: false,
      calendarProviderEnabled: false,
      canUseNangoRuntime: false,
      canUseGmailProvider: false,
      canUseCalendarProvider: false,
    });
  });
});

describe("canUseProviderRuntime", () => {
  it("is true only when global flag is enabled", () => {
    expect(canUseProviderRuntime({ CAREER_PROVIDER_RUNTIME_ENABLED: true })).toBe(true);
    expect(canUseProviderRuntime({})).toBe(false);
  });
});

describe("provider runtime flag safety", () => {
  it("does not read process.env", () => {
    const flagsSource = evaluateProviderRuntimeFlags.toString();
    expect(flagsSource).not.toMatch(/process\.env/);
    expect(readProviderRuntimeFlag.toString()).not.toMatch(/process\.env/);
  });

  it("does not perform fetch or network calls", () => {
    const moduleSource = [
      readProviderRuntimeFlag.toString(),
      evaluateProviderRuntimeFlags.toString(),
      canUseProviderRuntime.toString(),
    ].join("\n");
    expect(moduleSource).not.toMatch(/fetch\(/);
    expect(moduleSource).not.toMatch(/axios/);
  });

  it("evaluation result does not contain token fields", () => {
    const json = JSON.stringify(evaluateProviderRuntimeFlags(ALL_ENABLED));
    expect(json).not.toMatch(/access_token/);
    expect(json).not.toMatch(/refresh_token/);
    expect(json).not.toMatch(/client_secret/);
  });

  it("sandbox/mock flows do not require runtime flags to be enabled", () => {
    // Nango sandbox adapter and provider connection model work with empty flags (all disabled).
    expect(evaluateProviderRuntimeFlags({}).canUseNangoRuntime).toBe(false);
    expect(evaluateProviderRuntimeFlags({}).canUseGmailProvider).toBe(false);
    expect(evaluateProviderRuntimeFlags({}).canUseCalendarProvider).toBe(false);
  });
});
