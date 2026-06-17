import { describe, expect, it, vi } from "vitest";
import { isProviderConnectionDisconnectResultSafeForClient } from "@devflow/career-sync";
import { handleApplyFlowNangoConnectionDisconnect } from "./nango-connection-disconnect-boundary.js";
import type { NangoConnectionDisconnectProvider } from "./nango-connection-disconnect-provider.js";

const enabledEnv = {
  CAREER_PROVIDER_RUNTIME_ENABLED: "true",
  NANGO_RUNTIME_ENABLED: "true",
  GMAIL_PROVIDER_ENABLED: "true",
  CALENDAR_PROVIDER_ENABLED: "true",
  NANGO_SECRET_KEY: "test-secret",
};

function createDisconnectProvider(
  outcome: Awaited<ReturnType<NangoConnectionDisconnectProvider["disconnectProvider"]>>,
): NangoConnectionDisconnectProvider {
  return {
    disconnectProvider: vi.fn(async () => outcome),
  };
}

describe("handleApplyFlowNangoConnectionDisconnect", () => {
  it("blocks when explicit confirmation is missing", async () => {
    const result = await handleApplyFlowNangoConnectionDisconnect(
      { provider: "gmail", explicitConfirmation: false },
      {
        env: enabledEnv,
        disconnectDeps: {
          disconnectProvider: createDisconnectProvider({ kind: "deleted" }),
        },
      },
    );

    expect(result.status).toBe("blocked");
    expect(result.disconnected).toBe(false);
    expect(result.warnings).toContain("explicit_confirmation_required");
  });

  it("blocks invalid provider", async () => {
    const result = await handleApplyFlowNangoConnectionDisconnect(
      { provider: "linkedin", explicitConfirmation: true },
      {
        env: enabledEnv,
        disconnectDeps: {
          disconnectProvider: createDisconnectProvider({ kind: "deleted" }),
        },
      },
    );

    expect(result.status).toBe("error");
    expect(result.warnings).toContain("invalid_provider");
  });

  it("blocks when runtime flags are disabled", async () => {
    const result = await handleApplyFlowNangoConnectionDisconnect(
      { provider: "gmail", explicitConfirmation: true },
      {
        env: {
          ...enabledEnv,
          CAREER_PROVIDER_RUNTIME_ENABLED: "false",
        },
        disconnectDeps: {
          disconnectProvider: createDisconnectProvider({ kind: "deleted" }),
        },
      },
    );

    expect(result.status).toBe("blocked");
    expect(result.warnings).toContain("runtime_disabled");
  });

  it("blocks when provider flag is disabled", async () => {
    const result = await handleApplyFlowNangoConnectionDisconnect(
      { provider: "calendar", explicitConfirmation: true },
      {
        env: {
          ...enabledEnv,
          CALENDAR_PROVIDER_ENABLED: "false",
        },
        disconnectDeps: {
          disconnectProvider: createDisconnectProvider({ kind: "deleted" }),
        },
      },
    );

    expect(result.status).toBe("blocked");
    expect(result.warnings).toContain("provider_disabled");
  });

  it("blocks when secret is missing", async () => {
    const result = await handleApplyFlowNangoConnectionDisconnect(
      { provider: "gmail", explicitConfirmation: true },
      {
        env: {
          ...enabledEnv,
          NANGO_SECRET_KEY: "",
        },
        disconnectDeps: {},
      },
    );

    expect(result.status).toBe("blocked");
    expect(result.warnings).toContain("nango_secret_missing");
  });

  it("completes idempotently when no connection exists", async () => {
    const result = await handleApplyFlowNangoConnectionDisconnect(
      { provider: "gmail", explicitConfirmation: true },
      {
        env: enabledEnv,
        disconnectDeps: {
          disconnectProvider: createDisconnectProvider({ kind: "not_found" }),
        },
      },
    );

    expect(result.status).toBe("completed");
    expect(result.disconnected).toBe(true);
    expect(result.previouslyConnected).toBe(false);
    expect(result.verifiedByServer).toBe(true);
  });

  it("completes when a single connection is removed", async () => {
    const result = await handleApplyFlowNangoConnectionDisconnect(
      { provider: "calendar", explicitConfirmation: true },
      {
        env: enabledEnv,
        disconnectDeps: {
          disconnectProvider: createDisconnectProvider({ kind: "deleted" }),
        },
      },
    );

    expect(result.status).toBe("completed");
    expect(result.disconnected).toBe(true);
    expect(result.previouslyConnected).toBe(true);
    expect(result.verifiedByServer).toBe(true);
    expect(result.messages.join(" ")).toMatch(/Third-party connections/i);
  });

  it("errors on ambiguous connections", async () => {
    const result = await handleApplyFlowNangoConnectionDisconnect(
      { provider: "gmail", explicitConfirmation: true },
      {
        env: enabledEnv,
        disconnectDeps: {
          disconnectProvider: createDisconnectProvider({ kind: "ambiguous", connectionCount: 2 }),
        },
      },
    );

    expect(result.status).toBe("error");
    expect(result.warnings).toContain("ambiguous_provider_connections");
  });

  it("blocks when delete fails", async () => {
    const result = await handleApplyFlowNangoConnectionDisconnect(
      { provider: "gmail", explicitConfirmation: true },
      {
        env: enabledEnv,
        disconnectDeps: {
          disconnectProvider: createDisconnectProvider({ kind: "delete_failed" }),
        },
      },
    );

    expect(result.status).toBe("blocked");
    expect(result.warnings).toContain("nango_connection_delete_failed");
  });

  it("errors when post-delete verification still finds a connection", async () => {
    const result = await handleApplyFlowNangoConnectionDisconnect(
      { provider: "gmail", explicitConfirmation: true },
      {
        env: enabledEnv,
        disconnectDeps: {
          disconnectProvider: createDisconnectProvider({ kind: "verification_failed" }),
        },
      },
    );

    expect(result.status).toBe("error");
    expect(result.warnings).toContain("post_delete_verification_failed");
  });

  it("keeps client-safe response without secrets or connection identifiers", async () => {
    const result = await handleApplyFlowNangoConnectionDisconnect(
      { provider: "gmail", explicitConfirmation: true },
      {
        env: enabledEnv,
        disconnectDeps: {
          disconnectProvider: createDisconnectProvider({ kind: "deleted" }),
        },
      },
    );
    const serialized = JSON.stringify(result);

    expect(serialized).not.toMatch(/connectionId|connection_id|access_token|refresh_token/i);
    expect(isProviderConnectionDisconnectResultSafeForClient(result)).toBe(true);
  });

  it("remains idempotent on second disconnect", async () => {
    const disconnectProvider = createDisconnectProvider({ kind: "not_found" });

    const first = await handleApplyFlowNangoConnectionDisconnect(
      { provider: "gmail", explicitConfirmation: true },
      { env: enabledEnv, disconnectDeps: { disconnectProvider } },
    );
    const second = await handleApplyFlowNangoConnectionDisconnect(
      { provider: "gmail", explicitConfirmation: true },
      { env: enabledEnv, disconnectDeps: { disconnectProvider } },
    );

    expect(first.status).toBe("completed");
    expect(second.status).toBe("completed");
    expect(second.disconnected).toBe(true);
    expect(second.previouslyConnected).toBe(false);
  });
});
