import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NangoOAuthUrlProvider } from "@devflow/career-sync";
import {
  handleApplyFlowNangoConnectSessionLauncher,
  parseConnectLauncherExplicitConsent,
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

const connectSessionProvider = {
  createConnectSession: vi.fn(async () => ({
    connectSessionUrl: "/provider-runtime/nango/connect?provider=gmail",
    connectSessionToken: "client-safe-connect-session-token",
  })),
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

describe("parseConnectLauncherExplicitConsent", () => {
  it("accepts explicit consent query values", () => {
    const consent = parseConnectLauncherExplicitConsent("1", "gmail", "2026-06-12T10:00:00.000Z");
    expect(consent.hasExplicitConsent).toBe(true);
    expect(consent.scopes).toEqual(["gmail.metadata.read"]);
  });
});

describe("handleApplyFlowNangoConnectSessionLauncher", () => {
  beforeEach(() => {
    vi.mocked(oauthUrlProvider.createAuthorizationUrl).mockClear();
    vi.mocked(connectSessionProvider.createConnectSession).mockClear();
  });

  it("returns blocked when provider query is missing", async () => {
    const result = await handleApplyFlowNangoConnectSessionLauncher(
      { provider: null },
      { env: allFlagsOnEnv, sessionDeps: { oauthUrlProvider } },
    );

    expect(result.status).toBe("blocked");
    expect(result.reasons).toContain("missing_provider");
    expect(oauthUrlProvider.createAuthorizationUrl).not.toHaveBeenCalled();
  });

  it("returns blocked when provider query is invalid", async () => {
    const result = await handleApplyFlowNangoConnectSessionLauncher(
      { provider: "outlook" },
      { env: allFlagsOnEnv, sessionDeps: { oauthUrlProvider } },
    );

    expect(result.status).toBe("blocked");
    expect(result.reasons).toContain("invalid_provider");
  });

  it("blocks Gmail when runtime flags are absent", async () => {
    const result = await handleApplyFlowNangoConnectSessionLauncher(
      { provider: "gmail", explicitConsent: "1" },
      { env: {}, sessionDeps: { oauthUrlProvider } },
    );

    expect(result.status).toBe("blocked");
    expect(result.provider).toBe("gmail");
    expect(result.reasons).toContain("career_provider_runtime_disabled");
  });

  it("blocks when explicit consent is absent", async () => {
    const result = await handleApplyFlowNangoConnectSessionLauncher(
      { provider: "gmail" },
      { env: allFlagsOnEnv, sessionDeps: { oauthUrlProvider } },
    );

    expect(result.status).toBe("blocked");
    expect(result.reasons).toContain("missing_user_consent");
  });

  it("returns oauth_start_ready with connect session token when allowed", async () => {
    const result = await handleApplyFlowNangoConnectSessionLauncher(
      { provider: "gmail", explicitConsent: "1" },
      {
        env: allFlagsOnEnv,
        sessionDeps: { connectSessionProvider },
        requestedAt: "2026-06-12T10:05:00.000Z",
      },
    );

    expect(result.status).toBe("oauth_start_ready");
    expect(result.canStartOAuth).toBe(true);
    expect(result.connectSessionToken).toBe("client-safe-connect-session-token");
    expect(connectSessionProvider.createConnectSession).toHaveBeenCalledOnce();
  });

  it("does not call connectSessionProvider when blocked", async () => {
    await handleApplyFlowNangoConnectSessionLauncher(
      { provider: "gmail" },
      { env: {}, sessionDeps: { connectSessionProvider } },
    );

    expect(connectSessionProvider.createConnectSession).not.toHaveBeenCalled();
  });
});

describe("applyflow nango connect launcher safety", () => {
  it("client-safe JSON does not contain secrets, OAuth tokens, or provider payloads", async () => {
    const result = await handleApplyFlowNangoConnectSessionLauncher(
      { provider: "gmail", explicitConsent: "1" },
      { env: allFlagsOnEnv, sessionDeps: { connectSessionProvider }, requestedAt: "2026-06-12T10:05:00.000Z" },
    );
    const serialized = JSON.stringify(result);

    expect(serialized).not.toMatch(/NANGO_SECRET_KEY/);
    expect(serialized).not.toMatch(/access_token|refresh_token|client_secret|authorization_code/i);
    expect(serialized).not.toMatch(/providerPayload|rawBody|rawDescription/i);
    expect(serialized).not.toMatch(/hangoutLink|htmlLink|meetingLink/i);
  });
});
