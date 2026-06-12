import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createNangoSandboxAdapter } from "../src/nango-adapter/sandbox-adapter.js";
import {
  createDisabledProviderRuntimeResult,
  createDisabledProviderRuntimeShell,
  evaluateProviderRuntimeGate,
} from "../src/provider-runtime/runtime.js";
import type { ProviderRuntimeFlagMap } from "../src/provider-runtime-flags/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const allFlagsOff: ProviderRuntimeFlagMap = {};

const allRuntimeFlagsOn: ProviderRuntimeFlagMap = {
  CAREER_PROVIDER_RUNTIME_ENABLED: "true",
  NANGO_RUNTIME_ENABLED: "true",
  GMAIL_PROVIDER_ENABLED: "true",
  CALENDAR_PROVIDER_ENABLED: "true",
};

const noConsent = {
  hasExplicitConsent: false,
  scopes: [] as string[],
};

const explicitConsent = {
  hasExplicitConsent: true,
  consentedAt: "2026-06-12T10:00:00.000Z",
  scopes: ["gmail.metadata.read"],
};

function gateRequest(
  overrides: Partial<{
    provider: "gmail" | "calendar";
    runtime: "sandbox" | "nango" | "manual";
    flags: ProviderRuntimeFlagMap;
    consent: typeof noConsent | typeof explicitConsent;
  }> = {},
) {
  return {
    provider: overrides.provider ?? "gmail",
    runtime: overrides.runtime ?? "nango",
    flags: overrides.flags ?? allFlagsOff,
    consent: overrides.consent ?? noConsent,
  };
}

describe("evaluateProviderRuntimeGate", () => {
  it("blocks global runtime when flags are absent", () => {
    const gate = evaluateProviderRuntimeGate(gateRequest());

    expect(gate.status).toBe("blocked");
    expect(gate.reasons).toContain("career_provider_runtime_disabled");
  });

  it("blocks Nango when global runtime is false", () => {
    const gate = evaluateProviderRuntimeGate(
      gateRequest({
        flags: {
          CAREER_PROVIDER_RUNTIME_ENABLED: false,
          NANGO_RUNTIME_ENABLED: true,
        },
      }),
    );

    expect(gate.status).toBe("blocked");
    expect(gate.reasons).toContain("career_provider_runtime_disabled");
    expect(gate.reasons).toContain("nango_runtime_disabled");
  });

  it("blocks Nango when global is true but Nango flag is false", () => {
    const gate = evaluateProviderRuntimeGate(
      gateRequest({
        flags: {
          CAREER_PROVIDER_RUNTIME_ENABLED: true,
          NANGO_RUNTIME_ENABLED: false,
        },
      }),
    );

    expect(gate.status).toBe("blocked");
    expect(gate.reasons).toContain("nango_runtime_disabled");
    expect(gate.reasons).not.toContain("career_provider_runtime_disabled");
  });

  it("blocks Gmail when Gmail flag is true but global runtime is false", () => {
    const gate = evaluateProviderRuntimeGate(
      gateRequest({
        flags: {
          GMAIL_PROVIDER_ENABLED: true,
        },
      }),
    );

    expect(gate.status).toBe("blocked");
    expect(gate.reasons).toContain("career_provider_runtime_disabled");
    expect(gate.reasons).toContain("gmail_provider_disabled");
  });

  it("blocks Gmail when global and Gmail are true but Nango is false", () => {
    const gate = evaluateProviderRuntimeGate(
      gateRequest({
        flags: {
          CAREER_PROVIDER_RUNTIME_ENABLED: true,
          GMAIL_PROVIDER_ENABLED: true,
          NANGO_RUNTIME_ENABLED: false,
        },
      }),
    );

    expect(gate.status).toBe("blocked");
    expect(gate.reasons).toContain("nango_runtime_disabled");
    expect(gate.reasons).toContain("gmail_provider_disabled");
  });

  it("blocks Calendar when Calendar flag is true but global runtime is false", () => {
    const gate = evaluateProviderRuntimeGate(
      gateRequest({
        provider: "calendar",
        flags: {
          CALENDAR_PROVIDER_ENABLED: true,
        },
      }),
    );

    expect(gate.status).toBe("blocked");
    expect(gate.reasons).toContain("career_provider_runtime_disabled");
    expect(gate.reasons).toContain("calendar_provider_disabled");
  });

  it("blocks Calendar when global and Calendar are true but Nango is false", () => {
    const gate = evaluateProviderRuntimeGate(
      gateRequest({
        provider: "calendar",
        flags: {
          CAREER_PROVIDER_RUNTIME_ENABLED: true,
          CALENDAR_PROVIDER_ENABLED: true,
          NANGO_RUNTIME_ENABLED: false,
        },
      }),
    );

    expect(gate.status).toBe("blocked");
    expect(gate.reasons).toContain("nango_runtime_disabled");
    expect(gate.reasons).toContain("calendar_provider_disabled");
  });

  it("blocks with missing_user_consent when all flags are on but consent is absent", () => {
    const gate = evaluateProviderRuntimeGate(
      gateRequest({
        flags: allRuntimeFlagsOn,
        consent: noConsent,
      }),
    );

    expect(gate.status).toBe("blocked");
    expect(gate.reasons).toEqual(["missing_user_consent"]);
  });

  it("allows gate when all flags are on and explicit consent exists", () => {
    const gate = evaluateProviderRuntimeGate(
      gateRequest({
        flags: allRuntimeFlagsOn,
        consent: explicitConsent,
      }),
    );

    expect(gate.status).toBe("allowed");
    expect(gate.reasons).toEqual([]);
    expect(gate.consentRequired).toBe(true);
    expect(gate.userReviewRequired).toBe(true);
    expect(gate.flagEvaluation.canUseGmailProvider).toBe(true);
  });

  it("returns deterministic reasons in fixed order", () => {
    const gate = evaluateProviderRuntimeGate(
      gateRequest({
        provider: "gmail",
        flags: {
          GMAIL_PROVIDER_ENABLED: true,
        },
        consent: noConsent,
      }),
    );

    expect(gate.reasons).toEqual([
      "career_provider_runtime_disabled",
      "nango_runtime_disabled",
      "gmail_provider_disabled",
      "missing_user_consent",
    ]);
  });
});

describe("createDisabledProviderRuntimeResult", () => {
  it("returns disabled shell even when gate is allowed", () => {
    const gate = evaluateProviderRuntimeGate(
      gateRequest({
        flags: allRuntimeFlagsOn,
        consent: explicitConsent,
      }),
    );

    expect(gate.status).toBe("allowed");

    const shell = createDisabledProviderRuntimeResult(gate);

    expect(shell.status).toBe("disabled");
    expect(shell.canStartOAuth).toBe(false);
    expect(shell.canCallProvider).toBe(false);
    expect(shell.canStoreToken).toBe(false);
    expect(shell.canPersistProviderData).toBe(false);
    expect(shell.userReviewRequired).toBe(true);
    expect(shell.reasons).toEqual([]);
  });

  it("never allows OAuth, provider calls, token storage, or persistence", () => {
    const gate = evaluateProviderRuntimeGate(gateRequest());
    const shell = createDisabledProviderRuntimeResult(gate);

    expect(shell.canStartOAuth).toBe(false);
    expect(shell.canCallProvider).toBe(false);
    expect(shell.canStoreToken).toBe(false);
    expect(shell.canPersistProviderData).toBe(false);
  });

  it("preserves provider, runtime, and reasons from the gate", () => {
    const gate = evaluateProviderRuntimeGate(
      gateRequest({
        provider: "calendar",
        flags: { CALENDAR_PROVIDER_ENABLED: true },
      }),
    );
    const shell = createDisabledProviderRuntimeResult(gate);

    expect(shell.provider).toBe("calendar");
    expect(shell.runtime).toBe("nango");
    expect(shell.reasons).toEqual(gate.reasons);
  });
});

describe("createDisabledProviderRuntimeShell", () => {
  it("evaluates the gate and always returns a disabled result without side effects", () => {
    const shell = createDisabledProviderRuntimeShell(
      gateRequest({
        flags: allRuntimeFlagsOn,
        consent: explicitConsent,
      }),
    );

    expect(shell.status).toBe("disabled");
    expect(shell.canStartOAuth).toBe(false);
    expect(shell.canCallProvider).toBe(false);
    expect(shell.canStoreToken).toBe(false);
    expect(shell.canPersistProviderData).toBe(false);
    expect(shell.userReviewRequired).toBe(true);
  });
});

describe("provider runtime shell safety", () => {
  it("does not read process.env in runtime module source", () => {
    const runtimeSource = readFileSync(
      join(__dirname, "../src/provider-runtime/runtime.ts"),
      "utf8",
    );
    const typesSource = readFileSync(join(__dirname, "../src/provider-runtime/types.ts"), "utf8");

    expect(runtimeSource).not.toMatch(/process\.env/);
    expect(typesSource).not.toMatch(/process\.env/);
  });

  it("does not use fetch or network calls in runtime module source", () => {
    const runtimeSource = readFileSync(
      join(__dirname, "../src/provider-runtime/runtime.ts"),
      "utf8",
    );

    expect(runtimeSource).not.toMatch(/fetch\s*\(/);
    expect(runtimeSource).not.toMatch(/axios/);
    expect(runtimeSource).not.toMatch(/googleapis/);
  });

  it("does not import real Nango SDK in runtime module source", () => {
    const runtimeSource = readFileSync(
      join(__dirname, "../src/provider-runtime/runtime.ts"),
      "utf8",
    );

    expect(runtimeSource).not.toMatch(/from\s+['"]nango/);
  });

  it("does not contain token fields or provider payload retention in runtime types", () => {
    const typesSource = readFileSync(join(__dirname, "../src/provider-runtime/types.ts"), "utf8");

    expect(typesSource).not.toMatch(/access_token|refresh_token|client_secret|providerPayload/);
  });

  it("existing sandbox adapter works independently of runtime shell flags", () => {
    const adapter = createNangoSandboxAdapter({ provider: "gmail", payloads: [] });

    expect(adapter.provider).toBe("gmail");
    expect(adapter.runtime).toBe("sandbox");

    const shell = createDisabledProviderRuntimeShell(gateRequest({ runtime: "sandbox" }));

    expect(shell.status).toBe("disabled");
    expect(shell.reasons).toContain("unsupported_runtime");
  });
});
