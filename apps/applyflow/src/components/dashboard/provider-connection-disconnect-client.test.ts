import { describe, expect, it, vi } from "vitest";
import { createProviderConnectionDisconnectResult } from "@devflow/career-sync";
import {
  fetchProviderConnectionDisconnect,
  isProviderDisconnectUiEnabled,
  runProviderConnectionDisconnect,
} from "./provider-connection-disconnect-client";

describe("provider-connection-disconnect-client", () => {
  it("posts provider and explicit confirmation only", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () =>
        createProviderConnectionDisconnectResult({
          provider: "gmail",
          runtime: "nango",
          status: "completed",
          disconnected: true,
          previouslyConnected: true,
          verifiedByServer: true,
        }),
    })) as unknown as typeof fetch;

    const result = await fetchProviderConnectionDisconnect("gmail", true, fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith("/provider-runtime/nango/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "gmail",
        explicitConfirmation: true,
      }),
    });
    expect(result.disconnected).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/connectionId|connection_id/i);
  });

  it("disables UI while disconnecting", () => {
    expect(
      isProviderDisconnectUiEnabled({
        explicitConsentChecked: true,
        isDisconnecting: true,
        uiState: "idle",
      }),
    ).toBe(false);
  });

  it("wraps runProviderConnectionDisconnect", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () =>
        createProviderConnectionDisconnectResult({
          provider: "calendar",
          runtime: "nango",
          status: "completed",
          disconnected: true,
          previouslyConnected: false,
          verifiedByServer: true,
        }),
    })) as unknown as typeof fetch;

    const result = await runProviderConnectionDisconnect({
      provider: "calendar",
      explicitConfirmation: true,
      fetchImpl,
    });

    expect(result.status).toBe("completed");
  });
});
