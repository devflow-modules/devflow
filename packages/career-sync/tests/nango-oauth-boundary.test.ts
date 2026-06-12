import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { createNangoSandboxAdapter } from "../src/nango-adapter/sandbox-adapter.js";
import {
  createNangoOAuthBoundaryResult,
  evaluateNangoOAuthBoundary,
} from "../src/nango-runtime/oauth-boundary.js";
import type {
  NangoOAuthBoundaryRequest,
  NangoOAuthUrlProvider,
} from "../src/nango-runtime/types.js";
import type { ProviderRuntimeFlagMap } from "../src/provider-runtime-flags/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const allFlagsOff: ProviderRuntimeFlagMap = {};

const allFlagsOn: ProviderRuntimeFlagMap = {
  CAREER_PROVIDER_RUNTIME_ENABLED: "true",
  NANGO_RUNTIME_ENABLED: "true",
  GMAIL_PROVIDER_ENABLED: "true",
  CALENDAR_PROVIDER_ENABLED: "true",
};

const explicitConsent = {
  hasExplicitConsent: true,
  consentedAt: "2026-06-12T10:00:00.000Z",
  scopes: ["gmail.metadata.read"],
};

const baseRequest = {
  provider: "gmail",
  runtime: "nango",
  flags: allFlagsOn,
  consent: explicitConsent,
  requestedAt: "2026-06-12T10:05:00.000Z",
  source: "applyflow",
} satisfies NangoOAuthBoundaryRequest;

function expectOAuthSafetyFlags(result: ReturnType<typeof evaluateNangoOAuthBoundary>) {
  expect(result.safeForClient).toBe(true);
  expect(result.canCallProvider).toBe(false);
  expect(result.canStoreTokenInClient).toBe(false);
  expect(result.canPersistProviderData).toBe(false);
  expect(result.userReviewRequired).toBe(true);
}

describe("evaluateNangoOAuthBoundary", () => {
  it("blocks OAuth when flags are absent", () => {
    const result = evaluateNangoOAuthBoundary({
      ...baseRequest,
      flags: allFlagsOff,
    });

    expect(result.status).toBe("blocked");
    expect(result.canStartOAuth).toBe(false);
    expectOAuthSafetyFlags(result);
    expect(result.reasons).toContain("career_provider_runtime_disabled");
  });

  it("blocks OAuth when global flag is false", () => {
    const result = evaluateNangoOAuthBoundary({
      ...baseRequest,
      flags: {
        CAREER_PROVIDER_RUNTIME_ENABLED: false,
        NANGO_RUNTIME_ENABLED: true,
        GMAIL_PROVIDER_ENABLED: true,
      },
    });

    expect(result.status).toBe("blocked");
    expect(result.reasons).toContain("career_provider_runtime_disabled");
  });

  it("blocks OAuth when Nango flag is false", () => {
    const result = evaluateNangoOAuthBoundary({
      ...baseRequest,
      flags: {
        CAREER_PROVIDER_RUNTIME_ENABLED: true,
        NANGO_RUNTIME_ENABLED: false,
        GMAIL_PROVIDER_ENABLED: true,
      },
    });

    expect(result.status).toBe("blocked");
    expect(result.reasons).toContain("nango_runtime_disabled");
  });

  it("blocks Gmail OAuth when Gmail flag is false", () => {
    const result = evaluateNangoOAuthBoundary({
      ...baseRequest,
      flags: {
        CAREER_PROVIDER_RUNTIME_ENABLED: true,
        NANGO_RUNTIME_ENABLED: true,
        GMAIL_PROVIDER_ENABLED: false,
      },
    });

    expect(result.status).toBe("blocked");
    expect(result.reasons).toContain("gmail_provider_disabled");
  });

  it("blocks Calendar OAuth when Calendar flag is false", () => {
    const result = evaluateNangoOAuthBoundary({
      ...baseRequest,
      provider: "calendar",
      consent: {
        ...explicitConsent,
        scopes: ["calendar.events.read"],
      },
      flags: {
        CAREER_PROVIDER_RUNTIME_ENABLED: true,
        NANGO_RUNTIME_ENABLED: true,
        CALENDAR_PROVIDER_ENABLED: false,
      },
    });

    expect(result.status).toBe("blocked");
    expect(result.reasons).toContain("calendar_provider_disabled");
  });

  it("blocks OAuth when explicit consent is missing", () => {
    const result = evaluateNangoOAuthBoundary({
      ...baseRequest,
      consent: {
        hasExplicitConsent: false,
        scopes: [],
      },
    });

    expect(result.status).toBe("blocked");
    expect(result.reasons).toEqual(["missing_user_consent"]);
  });

  it("returns oauth_start_ready when all flags and consent allow OAuth", () => {
    const result = evaluateNangoOAuthBoundary(baseRequest);

    expect(result.status).toBe("oauth_start_ready");
    expect(result.canStartOAuth).toBe(true);
    expect(result.reasons).toEqual([]);
    expectOAuthSafetyFlags(result);
    expect(result.redirectTo).toBeUndefined();
  });
});

describe("createNangoOAuthBoundaryResult", () => {
  const oauthUrlProvider: NangoOAuthUrlProvider = {
    createAuthorizationUrl: vi.fn(async () => "https://connect.nango.dev/oauth/start?integration=gmail"),
  };

  it("does not call oauthUrlProvider when blocked", async () => {
    const provider = {
      createAuthorizationUrl: vi.fn(async () => "https://example.test/oauth"),
    };

    const result = await createNangoOAuthBoundaryResult(
      { ...baseRequest, flags: allFlagsOff },
      provider,
    );

    expect(result.status).toBe("blocked");
    expect(provider.createAuthorizationUrl).not.toHaveBeenCalled();
    expect(result.redirectTo).toBeUndefined();
  });

  it("calls oauthUrlProvider only when oauth_start_ready", async () => {
    const provider = {
      createAuthorizationUrl: vi.fn(async () => "https://connect.nango.dev/oauth/start?integration=gmail"),
    };

    const result = await createNangoOAuthBoundaryResult(baseRequest, provider);

    expect(result.status).toBe("oauth_start_ready");
    expect(provider.createAuthorizationUrl).toHaveBeenCalledOnce();
    expect(provider.createAuthorizationUrl).toHaveBeenCalledWith({
      provider: "gmail",
      redirectUri: undefined,
    });
    expect(result.redirectTo).toBe("https://connect.nango.dev/oauth/start?integration=gmail");
    expect(result.canStartOAuth).toBe(true);
  });
});

describe("nango oauth boundary safety", () => {
  it("serialized result does not contain tokens, secrets, or provider payloads", () => {
    const result = evaluateNangoOAuthBoundary(baseRequest);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toMatch(/access_token|refresh_token|client_secret|authorization_code/i);
    expect(serialized).not.toMatch(/providerPayload|rawBody|rawDescription/i);
    expect(serialized).not.toMatch(/hangoutLink|htmlLink|meetingLink/i);
    expect(serialized).not.toMatch(/raw email body|raw calendar description/i);
  });

  it("returns deterministic JSON for the same input", () => {
    const first = evaluateNangoOAuthBoundary(baseRequest);
    const second = evaluateNangoOAuthBoundary(baseRequest);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("does not read process.env in oauth boundary source", () => {
    const source = readFileSync(join(__dirname, "../src/nango-runtime/oauth-boundary.ts"), "utf8");

    expect(source).not.toMatch(/process\.env/);
    expect(source).not.toMatch(/fetch\s*\(/);
    expect(source).not.toMatch(/from\s+['"]nango/);
    expect(source).not.toMatch(/gmail\.users|calendar\.events|googleapis/);
  });

  it("sandbox adapter remains independent when OAuth flags are disabled", () => {
    const adapter = createNangoSandboxAdapter({ provider: "gmail", payloads: [] });
    const oauth = evaluateNangoOAuthBoundary({
      ...baseRequest,
      flags: allFlagsOff,
    });

    expect(adapter.runtime).toBe("sandbox");
    expect(oauth.status).toBe("blocked");
  });
});
