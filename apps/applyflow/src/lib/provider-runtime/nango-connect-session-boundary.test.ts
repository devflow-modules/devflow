import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NangoOAuthBoundaryRequest, NangoOAuthUrlProvider } from "@devflow/career-sync";
import { createApplyFlowNangoConnectSessionBoundary } from "./nango-connect-session-boundary.js";

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

const baseRequest = {
  provider: "gmail",
  runtime: "nango",
  flags: {},
  consent: explicitConsent,
  requestedAt: "2026-06-12T10:05:00.000Z",
  source: "applyflow",
} satisfies NangoOAuthBoundaryRequest;

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

describe("createApplyFlowNangoConnectSessionBoundary", () => {
  beforeEach(() => {
    vi.mocked(oauthUrlProvider.createAuthorizationUrl).mockClear();
    vi.mocked(connectSessionProvider.createConnectSession).mockClear();
  });

  it("blocks connect session when runtime flags are absent", async () => {
    const result = await createApplyFlowNangoConnectSessionBoundary(
      baseRequest,
      {},
      { oauthUrlProvider },
    );

    expect(result.status).toBe("blocked");
    expect(result.canStartOAuth).toBe(false);
    expect(result.reasons).toContain("career_provider_runtime_disabled");
    expect(oauthUrlProvider.createAuthorizationUrl).not.toHaveBeenCalled();
  });

  it("blocks when global runtime flag is false", async () => {
    const result = await createApplyFlowNangoConnectSessionBoundary(
      baseRequest,
      {
        ...allFlagsOnEnv,
        CAREER_PROVIDER_RUNTIME_ENABLED: "false",
      },
      { oauthUrlProvider },
    );

    expect(result.status).toBe("blocked");
    expect(result.reasons).toContain("career_provider_runtime_disabled");
  });

  it("blocks when Nango runtime flag is false", async () => {
    const result = await createApplyFlowNangoConnectSessionBoundary(
      baseRequest,
      {
        ...allFlagsOnEnv,
        NANGO_RUNTIME_ENABLED: "false",
      },
      { oauthUrlProvider },
    );

    expect(result.status).toBe("blocked");
    expect(result.reasons).toContain("nango_runtime_disabled");
  });

  it("blocks Gmail when Gmail provider flag is false", async () => {
    const result = await createApplyFlowNangoConnectSessionBoundary(
      baseRequest,
      {
        ...allFlagsOnEnv,
        GMAIL_PROVIDER_ENABLED: "false",
      },
      { oauthUrlProvider },
    );

    expect(result.status).toBe("blocked");
    expect(result.reasons).toContain("gmail_provider_disabled");
  });

  it("blocks Calendar when Calendar provider flag is false", async () => {
    const result = await createApplyFlowNangoConnectSessionBoundary(
      {
        ...baseRequest,
        provider: "calendar",
        consent: {
          ...explicitConsent,
          scopes: ["calendar.events.read"],
        },
      },
      {
        ...allFlagsOnEnv,
        CALENDAR_PROVIDER_ENABLED: "false",
      },
      { oauthUrlProvider },
    );

    expect(result.status).toBe("blocked");
    expect(result.reasons).toContain("calendar_provider_disabled");
  });

  it("blocks when explicit consent is missing", async () => {
    const result = await createApplyFlowNangoConnectSessionBoundary(
      {
        ...baseRequest,
        consent: {
          hasExplicitConsent: false,
          scopes: [],
        },
      },
      allFlagsOnEnv,
      { oauthUrlProvider },
    );

    expect(result.status).toBe("blocked");
    expect(result.reasons).toContain("missing_user_consent");
  });

  it("blocks when gates allow but Nango secret is missing server-side", async () => {
    const provider = {
      createAuthorizationUrl: vi.fn(async () => "/provider-runtime/nango/connect?provider=gmail"),
    };

    const result = await createApplyFlowNangoConnectSessionBoundary(
      baseRequest,
      {
        CAREER_PROVIDER_RUNTIME_ENABLED: "true",
        NANGO_RUNTIME_ENABLED: "true",
        GMAIL_PROVIDER_ENABLED: "true",
        CALENDAR_PROVIDER_ENABLED: "true",
      },
      { oauthUrlProvider: provider },
    );

    expect(result.status).toBe("blocked");
    expect(result.reasons).toContain("nango_secret_missing");
    expect(provider.createAuthorizationUrl).not.toHaveBeenCalled();
  });

  it("calls oauthUrlProvider when flags, consent, and secret allow OAuth", async () => {
    const provider = {
      createAuthorizationUrl: vi.fn(async () => "/provider-runtime/nango/connect?provider=gmail"),
    };

    const result = await createApplyFlowNangoConnectSessionBoundary(
      baseRequest,
      allFlagsOnEnv,
      { oauthUrlProvider: provider },
    );

    expect(result.status).toBe("oauth_start_ready");
    expect(result.canStartOAuth).toBe(true);
    expect(provider.createAuthorizationUrl).toHaveBeenCalledOnce();
    expect(result.connectSessionUrl).toBe("/provider-runtime/nango/connect?provider=gmail");
    expect(result.safeForClient).toBe(true);
  });

  it("returns connect session token from connectSessionProvider", async () => {
    const result = await createApplyFlowNangoConnectSessionBoundary(
      baseRequest,
      allFlagsOnEnv,
      { connectSessionProvider },
    );

    expect(result.status).toBe("oauth_start_ready");
    expect(result.connectSessionToken).toBe("client-safe-connect-session-token");
    expect(connectSessionProvider.createConnectSession).toHaveBeenCalledOnce();
  });

  it("does not call oauthUrlProvider when blocked", async () => {
    const provider = {
      createAuthorizationUrl: vi.fn(async () => "/provider-runtime/nango/connect?provider=gmail"),
    };

    await createApplyFlowNangoConnectSessionBoundary(baseRequest, {}, { oauthUrlProvider: provider });

    expect(provider.createAuthorizationUrl).not.toHaveBeenCalled();
  });
});

describe("applyflow nango connect session safety", () => {
  it("client-safe result does not contain secrets, OAuth tokens, or provider payloads", async () => {
    const result = await createApplyFlowNangoConnectSessionBoundary(
      baseRequest,
      allFlagsOnEnv,
      { connectSessionProvider },
    );
    const serialized = JSON.stringify(result);

    expect(serialized).not.toMatch(/NANGO_SECRET_KEY/);
    expect(serialized).not.toMatch(/access_token|refresh_token|client_secret|authorization_code/i);
    expect(serialized).not.toMatch(/providerPayload|rawBody|rawDescription/i);
    expect(serialized).not.toMatch(/hangoutLink|htmlLink|meetingLink/i);
    expect(serialized).not.toMatch(/raw email body|raw calendar description/i);
  });
});
