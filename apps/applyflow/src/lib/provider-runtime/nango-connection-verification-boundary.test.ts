import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleApplyFlowNangoConnectionVerification } from "./nango-connection-verification-boundary.js";

const allFlagsOnEnv = {
  CAREER_PROVIDER_RUNTIME_ENABLED: "true",
  NANGO_RUNTIME_ENABLED: "true",
  GMAIL_PROVIDER_ENABLED: "true",
  CALENDAR_PROVIDER_ENABLED: "true",
  NANGO_SECRET_KEY: "nango-secret-test",
};

const verificationProvider = {
  verifyConnection: vi.fn(async () => ({ exists: true, state: "connected" as const })),
};

describe("handleApplyFlowNangoConnectionVerification", () => {
  beforeEach(() => {
    vi.mocked(verificationProvider.verifyConnection).mockClear();
  });

  it("blocks verification when runtime flags are absent", async () => {
    const result = await handleApplyFlowNangoConnectionVerification(
      { provider: "gmail", explicitConsent: true },
      { env: {}, verificationDeps: { verificationProvider } },
    );

    expect(result.state).toBe("error");
    expect(result.warnings).toContain("Provider runtime is disabled.");
    expect(verificationProvider.verifyConnection).not.toHaveBeenCalled();
  });

  it("blocks verification when Nango runtime flag is false", async () => {
    const result = await handleApplyFlowNangoConnectionVerification(
      { provider: "gmail", explicitConsent: true },
      {
        env: { ...allFlagsOnEnv, NANGO_RUNTIME_ENABLED: "false" },
        verificationDeps: { verificationProvider },
      },
    );

    expect(result.state).toBe("error");
    expect(result.warnings).toContain("Nango runtime is disabled.");
    expect(verificationProvider.verifyConnection).not.toHaveBeenCalled();
  });

  it("blocks verification when secret is missing", async () => {
    const result = await handleApplyFlowNangoConnectionVerification(
      { provider: "gmail", explicitConsent: true },
      {
        env: { ...allFlagsOnEnv, NANGO_SECRET_KEY: "" },
        verificationDeps: {},
      },
    );

    expect(result.state).toBe("error");
    expect(result.warnings.join(" ")).toMatch(/secret key is required/i);
    expect(verificationProvider.verifyConnection).not.toHaveBeenCalled();
  });

  it("blocks verification without explicit consent", async () => {
    const result = await handleApplyFlowNangoConnectionVerification(
      { provider: "gmail", explicitConsent: false },
      {
        env: allFlagsOnEnv,
        verificationDeps: { verificationProvider },
      },
    );

    expect(result.state).toBe("error");
    expect(result.warnings).toContain("Explicit consent is required before server verification.");
    expect(verificationProvider.verifyConnection).not.toHaveBeenCalled();
  });

  it("rejects invalid provider", async () => {
    const result = await handleApplyFlowNangoConnectionVerification(
      { provider: "invalid", explicitConsent: true },
      {
        env: allFlagsOnEnv,
        verificationDeps: { verificationProvider },
      },
    );

    expect(result.state).toBe("error");
    expect(result.warnings).toContain("Provider must be gmail or calendar.");
    expect(verificationProvider.verifyConnection).not.toHaveBeenCalled();
  });

  it("returns connected when provider finds a connection", async () => {
    const result = await handleApplyFlowNangoConnectionVerification(
      { provider: "gmail", explicitConsent: true },
      {
        env: allFlagsOnEnv,
        verificationDeps: { verificationProvider },
        requestedAt: "2026-06-12T12:00:00.000Z",
      },
    );

    expect(result.state).toBe("connected");
    expect(result.verifiedByServer).toBe(true);
    expect(result.messages.join(" ")).toMatch(/No Gmail or Calendar data has been imported/i);
    expect(verificationProvider.verifyConnection).toHaveBeenCalledWith({ provider: "gmail" });
  });

  it("returns not_connected when provider finds no connection", async () => {
    vi.mocked(verificationProvider.verifyConnection).mockResolvedValueOnce({
      exists: false,
      state: "not_connected",
    });

    const result = await handleApplyFlowNangoConnectionVerification(
      { provider: "calendar", explicitConsent: true },
      {
        env: allFlagsOnEnv,
        verificationDeps: { verificationProvider },
      },
    );

    expect(result.state).toBe("not_connected");
    expect(result.verifiedByServer).toBe(true);
  });

  it("returns sanitized error when provider reports error", async () => {
    vi.mocked(verificationProvider.verifyConnection).mockResolvedValueOnce({
      exists: false,
      state: "error",
    });

    const result = await handleApplyFlowNangoConnectionVerification(
      { provider: "gmail", explicitConsent: true },
      {
        env: allFlagsOnEnv,
        verificationDeps: { verificationProvider },
      },
    );

    expect(result.state).toBe("error");
    expect(JSON.stringify(result)).not.toMatch(/access_token/i);
    expect(JSON.stringify(result)).not.toMatch(/refresh_token/i);
    expect(JSON.stringify(result)).not.toMatch(/client_secret/i);
  });

  it("never returns raw connection object or Gmail/Calendar payload", async () => {
    const result = await handleApplyFlowNangoConnectionVerification(
      { provider: "gmail", explicitConsent: true },
      {
        env: allFlagsOnEnv,
        verificationDeps: { verificationProvider },
      },
    );
    const serialized = JSON.stringify(result);

    expect(serialized).not.toMatch(/connection_id/i);
    expect(serialized).not.toMatch(/"providerPayload"/i);
    expect(serialized).not.toMatch(/googleapis/i);
    expect(result.canImportProviderData).toBe(false);
    expect(result.canSync).toBe(false);
  });
});
