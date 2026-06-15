import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeApplyFlowGmailReadOnlyRuntimeBoundary } from "./gmail-readonly-runtime-boundary.js";
import type { GmailNangoRuntimeMetadataProvider } from "./gmail-readonly-nango-provider.js";

const allFlagsOnEnv = {
  CAREER_PROVIDER_RUNTIME_ENABLED: "true",
  NANGO_RUNTIME_ENABLED: "true",
  GMAIL_PROVIDER_ENABLED: "true",
  CALENDAR_PROVIDER_ENABLED: "true",
  NANGO_SECRET_KEY: "nango-secret-test",
};

const requestedAt = "2026-06-15T12:00:00.000Z";

const metadataProvider: GmailNangoRuntimeMetadataProvider = {
  listMessageMetadata: vi.fn(async () => [
    {
      occurredAt: "2026-06-20T14:00:00.000Z",
      direction: "unknown",
      senderDomain: "jobs.example",
      recipientDomains: ["candidate.example"],
      hasAttachment: false,
    },
  ]),
};

describe("executeApplyFlowGmailReadOnlyRuntimeBoundary", () => {
  beforeEach(() => {
    vi.mocked(metadataProvider.listMessageMetadata).mockClear();
  });

  it("blocks when runtime flags are absent", async () => {
    const result = await executeApplyFlowGmailReadOnlyRuntimeBoundary(
      { explicitConsent: true },
      {
        env: {},
        connectionVerified: true,
        requestedAt,
        runtimeDeps: { metadataProvider },
      },
    );

    expect(result.status).toBe("blocked");
    expect(result.warnings).toContain("Provider runtime is disabled.");
    expect(metadataProvider.listMessageMetadata).not.toHaveBeenCalled();
  });

  it("blocks when Nango runtime flag is false", async () => {
    const result = await executeApplyFlowGmailReadOnlyRuntimeBoundary(
      { explicitConsent: true },
      {
        env: { ...allFlagsOnEnv, NANGO_RUNTIME_ENABLED: "false" },
        connectionVerified: true,
        requestedAt,
        runtimeDeps: { metadataProvider },
      },
    );

    expect(result.status).toBe("blocked");
    expect(result.warnings).toContain("Nango runtime is disabled.");
    expect(metadataProvider.listMessageMetadata).not.toHaveBeenCalled();
  });

  it("blocks when Gmail provider flag is false", async () => {
    const result = await executeApplyFlowGmailReadOnlyRuntimeBoundary(
      { explicitConsent: true },
      {
        env: { ...allFlagsOnEnv, GMAIL_PROVIDER_ENABLED: "false" },
        connectionVerified: true,
        requestedAt,
        runtimeDeps: { metadataProvider },
      },
    );

    expect(result.status).toBe("blocked");
    expect(result.warnings).toContain("Gmail provider is disabled.");
    expect(metadataProvider.listMessageMetadata).not.toHaveBeenCalled();
  });

  it("blocks when secret is missing", async () => {
    const result = await executeApplyFlowGmailReadOnlyRuntimeBoundary(
      { explicitConsent: true },
      {
        env: { ...allFlagsOnEnv, NANGO_SECRET_KEY: "" },
        connectionVerified: true,
        requestedAt,
        runtimeDeps: { metadataProvider },
      },
    );

    expect(result.status).toBe("blocked");
    expect(result.warnings.join(" ")).toMatch(/secret key is required/i);
    expect(metadataProvider.listMessageMetadata).not.toHaveBeenCalled();
  });

  it("blocks without explicit consent", async () => {
    const result = await executeApplyFlowGmailReadOnlyRuntimeBoundary(
      { explicitConsent: false },
      {
        env: allFlagsOnEnv,
        connectionVerified: true,
        requestedAt,
        runtimeDeps: { metadataProvider },
      },
    );

    expect(result.status).toBe("blocked");
    expect(result.warnings.join(" ")).toMatch(/Explicit consent is required/i);
    expect(metadataProvider.listMessageMetadata).not.toHaveBeenCalled();
  });

  it("blocks when connection is not verified", async () => {
    const result = await executeApplyFlowGmailReadOnlyRuntimeBoundary(
      { explicitConsent: true },
      {
        env: allFlagsOnEnv,
        connectionVerified: false,
        requestedAt,
        runtimeDeps: { metadataProvider },
      },
    );

    expect(result.status).toBe("blocked");
    expect(result.warnings.join(" ")).toMatch(/connection_not_verified/);
    expect(metadataProvider.listMessageMetadata).not.toHaveBeenCalled();
  });

  it("executes adapter with injected metadata provider when gates pass", async () => {
    const result = await executeApplyFlowGmailReadOnlyRuntimeBoundary(
      { explicitConsent: true },
      {
        env: allFlagsOnEnv,
        connectionVerified: true,
        requestedAt,
        runtimeDeps: { metadataProvider },
      },
    );

    expect(result.status).toBe("completed");
    expect(result.runtime).toBe("nango");
    expect(result.processedMessageCount).toBe(1);
    expect(metadataProvider.listMessageMetadata).toHaveBeenCalledOnce();
  });

  it("returns sanitized provider error without partial data", async () => {
    const failingProvider: GmailNangoRuntimeMetadataProvider = {
      listMessageMetadata: vi.fn(async () => {
        throw new Error("nango sdk failure access_token");
      }),
    };

    const result = await executeApplyFlowGmailReadOnlyRuntimeBoundary(
      { explicitConsent: true },
      {
        env: allFlagsOnEnv,
        connectionVerified: true,
        requestedAt,
        runtimeDeps: { metadataProvider: failingProvider },
      },
    );

    expect(result.status).toBe("error");
    expect(result.signals).toEqual([]);
    expect(JSON.stringify(result)).not.toMatch(/access_token/);
  });
});
