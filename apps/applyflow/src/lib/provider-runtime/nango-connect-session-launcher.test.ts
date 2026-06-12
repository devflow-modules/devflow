import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NangoOAuthUrlProvider } from "@devflow/career-sync";
import {
  handleApplyFlowNangoConnectSessionLauncher,
  parseConnectLauncherProvider,
} from "./nango-connect-session-launcher.js";

const allFlagsOnEnv = {
  CAREER_PROVIDER_RUNTIME_ENABLED: "true",
  NANGO_RUNTIME_ENABLED: "true",
  GMAIL_PROVIDER_ENABLED: "true",
  CALENDAR_PROVIDER_ENABLED: "true",
  NANGO_SECRET_KEY: "nango-secret-test",
};

const explicitConsent = {
  hasExplicitConsent: true,
  consentedAt: "2026-06-12T10:00:00.000Z",
  scopes: ["gmail.metadata.read"],
};

const oauthUrlProvider: NangoOAuthUrlProvider = {
  createAuthorizationUrl: vi.fn(
    async () => "/provider-runtime/nango/connect?provider=gmail",
  ),
};

describe("parseConnectLauncherProvider", () => {
  it("accepts gmail and calendar", () => {
    expect(parseConnectLauncherProvider("gmail")).toBe("gmail");
    expect(parseConnectLauncherProvider("calendar")).toBe("calendar");
  });

  it("rejects invalid providers", () => {
    expect(parseConnectLauncherProvider("outlook")).toBeNull();
    expect(parseConnectLauncherProvider("")).toBeNull();
  });
});

describe("handleApplyFlowNangoConnectSessionLauncher", () => {
  beforeEach(() => {
    vi.mocked(oauthUrlProvider.createAuthorizationUrl).mockClear();
  });

  it("returns blocked when provider query is missing", async () => {
    const result = await handleApplyFlowNangoConnectSessionLauncher(
      { provider: null },
      { env: allFlagsOnEnv, oauthUrlProvider },
    );

    expect(result.status).toBe("blocked");
    expect(result.reasons).toContain("missing_provider");
    expect(oauthUrlProvider.createAuthorizationUrl).not.toHaveBeenCalled();
  });

  it("returns blocked when provider query is invalid", async () => {
    const result = await handleApplyFlowNangoConnectSessionLauncher(
      { provider: "outlook" },
      { env: allFlagsOnEnv, oauthUrlProvider },
    );

    expect(result.status).toBe("blocked");
    expect(result.reasons).toContain("invalid_provider");
  });

  it("blocks Gmail when runtime flags are absent", async () => {
    const result = await handleApplyFlowNangoConnectSessionLauncher(
      { provider: "gmail" },
      { env: {}, oauthUrlProvider },
    );

    expect(result.status).toBe("blocked");
    expect(result.provider).toBe("gmail");
    expect(result.reasons).toContain("career_provider_runtime_disabled");
  });

  it("blocks Calendar when runtime flags are absent", async () => {
    const result = await handleApplyFlowNangoConnectSessionLauncher(
      { provider: "calendar" },
      { env: {}, oauthUrlProvider },
    );

    expect(result.status).toBe("blocked");
    expect(result.provider).toBe("calendar");
  });

  it("blocks when global runtime flag is false", async () => {
    const result = await handleApplyFlowNangoConnectSessionLauncher(
      { provider: "gmail" },
      {
        env: { ...allFlagsOnEnv, CAREER_PROVIDER_RUNTIME_ENABLED: "false" },
        oauthUrlProvider,
      },
    );

    expect(result.reasons).toContain("career_provider_runtime_disabled");
  });

  it("blocks when Nango runtime flag is false", async () => {
    const result = await handleApplyFlowNangoConnectSessionLauncher(
      { provider: "gmail" },
      {
        env: { ...allFlagsOnEnv, NANGO_RUNTIME_ENABLED: "false" },
        oauthUrlProvider,
      },
    );

    expect(result.reasons).toContain("nango_runtime_disabled");
  });

  it("blocks Gmail when Gmail provider flag is false", async () => {
    const result = await handleApplyFlowNangoConnectSessionLauncher(
      { provider: "gmail" },
      {
        env: { ...allFlagsOnEnv, GMAIL_PROVIDER_ENABLED: "false" },
        oauthUrlProvider,
      },
    );

    expect(result.reasons).toContain("gmail_provider_disabled");
  });

  it("blocks Calendar when Calendar provider flag is false", async () => {
    const result = await handleApplyFlowNangoConnectSessionLauncher(
      { provider: "calendar" },
      {
        env: { ...allFlagsOnEnv, CALENDAR_PROVIDER_ENABLED: "false" },
        oauthUrlProvider,
      },
    );

    expect(result.reasons).toContain("calendar_provider_disabled");
  });

  it("blocks when explicit consent is absent (preview-only default)", async () => {
    const result = await handleApplyFlowNangoConnectSessionLauncher(
      { provider: "gmail" },
      { env: allFlagsOnEnv, oauthUrlProvider },
    );

    expect(result.status).toBe("blocked");
    expect(result.reasons).toContain("missing_user_consent");
    expect(oauthUrlProvider.createAuthorizationUrl).not.toHaveBeenCalled();
  });

  it("blocks when gates allow but Nango secret is missing", async () => {
    const provider = {
      createAuthorizationUrl: vi.fn(async () => "/provider-runtime/nango/connect?provider=gmail"),
    };

    const result = await handleApplyFlowNangoConnectSessionLauncher(
      { provider: "gmail" },
      {
        env: {
          CAREER_PROVIDER_RUNTIME_ENABLED: "true",
          NANGO_RUNTIME_ENABLED: "true",
          GMAIL_PROVIDER_ENABLED: "true",
          CALENDAR_PROVIDER_ENABLED: "true",
        },
        oauthUrlProvider: provider,
        consent: explicitConsent,
      },
    );

    expect(result.status).toBe("blocked");
    expect(result.reasons).toContain("nango_secret_missing");
    expect(provider.createAuthorizationUrl).not.toHaveBeenCalled();
  });

  it("returns oauth_start_ready when flags, consent, and secret allow OAuth", async () => {
    const provider = {
      createAuthorizationUrl: vi.fn(async () => "/provider-runtime/nango/connect?provider=gmail"),
    };

    const result = await handleApplyFlowNangoConnectSessionLauncher(
      { provider: "gmail" },
      {
        env: allFlagsOnEnv,
        oauthUrlProvider: provider,
        consent: explicitConsent,
        requestedAt: "2026-06-12T10:05:00.000Z",
      },
    );

    expect(result.status).toBe("oauth_start_ready");
    expect(result.canStartOAuth).toBe(true);
    expect(provider.createAuthorizationUrl).toHaveBeenCalledOnce();
    expect(result.connectSessionUrl).toBe("/provider-runtime/nango/connect?provider=gmail");
  });

  it("does not call oauthUrlProvider when blocked", async () => {
    await handleApplyFlowNangoConnectSessionLauncher(
      { provider: "gmail" },
      { env: {}, oauthUrlProvider },
    );

    expect(oauthUrlProvider.createAuthorizationUrl).not.toHaveBeenCalled();
  });
});

describe("applyflow nango connect launcher safety", () => {
  it("client-safe JSON does not contain secrets, tokens, or provider payloads", async () => {
    const result = await handleApplyFlowNangoConnectSessionLauncher(
      { provider: "gmail" },
      { env: allFlagsOnEnv, oauthUrlProvider, consent: explicitConsent },
    );
    const serialized = JSON.stringify(result);

    expect(serialized).not.toMatch(/NANGO_SECRET_KEY/);
    expect(serialized).not.toMatch(/access_token|refresh_token|client_secret|authorization_code/i);
    expect(serialized).not.toMatch(/providerPayload|rawBody|rawDescription/i);
    expect(serialized).not.toMatch(/hangoutLink|htmlLink|meetingLink/i);
  });
});
