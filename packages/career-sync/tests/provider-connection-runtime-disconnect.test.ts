import { describe, expect, it } from "vitest";
import {
  createProviderConnectionDisconnectResult,
  isProviderConnectionDisconnectResultSafeForClient,
} from "../src/provider-connection/runtime-disconnect.js";

describe("createProviderConnectionDisconnectResult", () => {
  it("creates completed disconnect result with Google revocation hint", () => {
    const result = createProviderConnectionDisconnectResult({
      provider: "gmail",
      runtime: "nango",
      status: "completed",
      disconnected: true,
      previouslyConnected: true,
      verifiedByServer: true,
    });

    expect(result.disconnected).toBe(true);
    expect(result.messages.join(" ")).toMatch(/removed from ApplyFlow/i);
    expect(result.messages.join(" ")).toMatch(/Third-party connections/i);
  });

  it("creates idempotent completed result when no connection existed", () => {
    const result = createProviderConnectionDisconnectResult({
      provider: "calendar",
      runtime: "nango",
      status: "completed",
      disconnected: true,
      previouslyConnected: false,
      verifiedByServer: true,
    });

    expect(result.previouslyConnected).toBe(false);
    expect(result.messages.join(" ")).toMatch(/already complete/i);
  });

  it("creates blocked disconnect result", () => {
    const result = createProviderConnectionDisconnectResult({
      provider: "gmail",
      runtime: "nango",
      status: "blocked",
      disconnected: false,
      previouslyConnected: false,
      verifiedByServer: false,
      warnings: ["explicit_confirmation_required"],
    });

    expect(result.status).toBe("blocked");
    expect(result.warnings).toContain("explicit_confirmation_required");
  });

  it("always keeps capability flags disabled", () => {
    const result = createProviderConnectionDisconnectResult({
      provider: "gmail",
      runtime: "nango",
      status: "completed",
      disconnected: true,
      previouslyConnected: true,
      verifiedByServer: true,
    });

    expect(result.hasToken).toBe(false);
    expect(result.canSync).toBe(false);
    expect(result.canImportProviderData).toBe(false);
    expect(result.canPersistProviderPayload).toBe(false);
    expect(result.safeForClient).toBe(true);
  });
});

describe("provider connection disconnect safety", () => {
  it("serialized result does not contain secrets, tokens, or connection identifiers", () => {
    const result = createProviderConnectionDisconnectResult({
      provider: "gmail",
      runtime: "nango",
      status: "completed",
      disconnected: true,
      previouslyConnected: true,
      verifiedByServer: true,
    });
    const serialized = JSON.stringify(result);

    expect(serialized).not.toMatch(/access_token/i);
    expect(serialized).not.toMatch(/refresh_token/i);
    expect(serialized).not.toMatch(/client_secret/i);
    expect(serialized).not.toMatch(/connectionId/i);
    expect(serialized).not.toMatch(/connection_id/i);
    expect(isProviderConnectionDisconnectResultSafeForClient(result)).toBe(true);
  });

  it("rejects adulterated disconnect result", () => {
    const result = createProviderConnectionDisconnectResult({
      provider: "gmail",
      runtime: "nango",
      status: "completed",
      disconnected: true,
      previouslyConnected: true,
      verifiedByServer: true,
    });

    const tampered = {
      ...result,
      hasToken: true as unknown as false,
    };

    expect(isProviderConnectionDisconnectResultSafeForClient(tampered)).toBe(false);
  });
});
