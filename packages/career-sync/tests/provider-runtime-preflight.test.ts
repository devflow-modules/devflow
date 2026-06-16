import { describe, expect, it } from "vitest";
import {
  assertPreflightOutputIsSafe,
  classifyProviderRuntimeEnvValue,
  evaluateCareerProviderRuntimePreflight,
  formatCareerProviderRuntimePreflightLines,
  isProviderRuntimeDefaultOff,
} from "../src/provider-runtime-preflight/index.js";

describe("evaluateCareerProviderRuntimePreflight", () => {
  it("reports ready when all flags are absent (default-off)", () => {
    const report = evaluateCareerProviderRuntimePreflight({});

    expect(report.status).toBe("ready");
    expect(report.gmailRuntime).toBe("disabled");
    expect(report.calendarRuntime).toBe("disabled");
    expect(isProviderRuntimeDefaultOff({})).toBe(true);
  });

  it("blocks when Gmail flag is on without master flag", () => {
    const report = evaluateCareerProviderRuntimePreflight({
      GMAIL_PROVIDER_ENABLED: "true",
    });

    expect(report.status).toBe("blocked");
    expect(report.issues).toContain(
      "GMAIL_PROVIDER_ENABLED without CAREER_PROVIDER_RUNTIME_ENABLED",
    );
  });

  it("blocks when provider flag is on while master flag is off", () => {
    const report = evaluateCareerProviderRuntimePreflight({
      GMAIL_PROVIDER_ENABLED: "true",
      NANGO_RUNTIME_ENABLED: "true",
    });

    expect(report.status).toBe("blocked");
    expect(report.issues).toContain(
      "GMAIL_PROVIDER_ENABLED without CAREER_PROVIDER_RUNTIME_ENABLED",
    );
  });

  it("blocks when runtime flags are on but secret is missing", () => {
    const report = evaluateCareerProviderRuntimePreflight({
      CAREER_PROVIDER_RUNTIME_ENABLED: "true",
      NANGO_RUNTIME_ENABLED: "true",
      GMAIL_PROVIDER_ENABLED: "true",
    });

    expect(report.status).toBe("blocked");
    expect(report.gmailRuntime).toBe("blocked");
    expect(report.issues).toContain("Gmail runtime enabled but NANGO_SECRET_KEY is not configured");
  });

  it("detects placeholder secret values", () => {
    const report = evaluateCareerProviderRuntimePreflight({
      CAREER_PROVIDER_RUNTIME_ENABLED: "true",
      NANGO_RUNTIME_ENABLED: "true",
      NANGO_SECRET_KEY: "replace_me",
    });

    expect(report.nangoSecret).toBe("placeholder");
    expect(report.issues).toContain("NANGO_SECRET_KEY uses a placeholder value");
    expect(report.status).toBe("blocked");
  });

  it("reports configured Gmail runtime when hierarchy and secret are valid", () => {
    const report = evaluateCareerProviderRuntimePreflight({
      CAREER_PROVIDER_RUNTIME_ENABLED: "true",
      NANGO_RUNTIME_ENABLED: "true",
      GMAIL_PROVIDER_ENABLED: "true",
      NANGO_SECRET_KEY: "sandbox-secret-not-real",
    });

    expect(report.gmailRuntime).toBe("configured");
    expect(report.calendarRuntime).toBe("disabled");
    expect(report.status).toBe("ready");
  });
});

describe("formatCareerProviderRuntimePreflightLines", () => {
  it("never prints secret values", () => {
    const env = {
      NANGO_SECRET_KEY: "super-secret-nango-key-value",
      CAREER_PROVIDER_RUNTIME_ENABLED: "true",
      NANGO_RUNTIME_ENABLED: "true",
    };
    const report = evaluateCareerProviderRuntimePreflight(env);
    const output = formatCareerProviderRuntimePreflightLines(report).join("\n");

    expect(output).toContain("NANGO_SECRET_KEY: configured");
    expect(output).not.toContain("super-secret-nango-key-value");
    assertPreflightOutputIsSafe(output, env);
  });

  it("labels missing public configuration keys as missing", () => {
    const lines = formatCareerProviderRuntimePreflightLines(
      evaluateCareerProviderRuntimePreflight({}),
    );

    expect(lines).toContain("NANGO_SECRET_KEY: missing");
    expect(lines).toContain("Preflight: ready");
  });
});

describe("classifyProviderRuntimeEnvValue", () => {
  it.each(["replace_me", "changeme", "test-provider-config"])(
    "treats %s as placeholder",
    (value) => {
      expect(classifyProviderRuntimeEnvValue(value)).toBe("placeholder");
    },
  );
});

describe("default-off invariant", () => {
  it("treats only true and string true as enabled", () => {
    expect(
      isProviderRuntimeDefaultOff({
        CAREER_PROVIDER_RUNTIME_ENABLED: "TRUE",
        NANGO_RUNTIME_ENABLED: "1",
        GMAIL_PROVIDER_ENABLED: "yes",
      }),
    ).toBe(true);
  });
});
