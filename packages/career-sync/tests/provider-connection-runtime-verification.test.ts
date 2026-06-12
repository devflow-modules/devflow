import { describe, expect, it } from "vitest";
import {
  createProviderConnectionVerificationResult,
  isProviderConnectionVerificationResultSafeForClient,
} from "../src/provider-connection/runtime-verification.js";

const checkedAt = "2026-06-12T12:00:00.000Z";

describe("createProviderConnectionVerificationResult", () => {
  it("creates connected verification result", () => {
    const result = createProviderConnectionVerificationResult({
      provider: "gmail",
      runtime: "nango",
      state: "connected",
      checkedAt,
    });

    expect(result.state).toBe("connected");
    expect(result.messages.join(" ")).toMatch(
      /Connection verified by the server runtime\. No Gmail or Calendar data has been imported\./,
    );
  });

  it("creates not_connected verification result", () => {
    const result = createProviderConnectionVerificationResult({
      provider: "calendar",
      runtime: "nango",
      state: "not_connected",
      checkedAt,
    });

    expect(result.state).toBe("not_connected");
    expect(result.messages.join(" ")).toMatch(/No provider connection was found/i);
  });

  it("creates error verification result", () => {
    const result = createProviderConnectionVerificationResult({
      provider: "gmail",
      runtime: "nango",
      state: "error",
      checkedAt,
    });

    expect(result.state).toBe("error");
    expect(result.messages.join(" ")).toMatch(/No provider data was imported or stored/i);
  });

  it("always keeps verifiedByServer and safeForClient true", () => {
    const result = createProviderConnectionVerificationResult({
      provider: "gmail",
      runtime: "nango",
      state: "connected",
      checkedAt,
    });

    expect(result.verifiedByServer).toBe(true);
    expect(result.safeForClient).toBe(true);
  });

  it("always keeps sync/import/payload/token flags disabled", () => {
    const result = createProviderConnectionVerificationResult({
      provider: "gmail",
      runtime: "nango",
      state: "connected",
      checkedAt,
    });

    expect(result.canSync).toBe(false);
    expect(result.canImportProviderData).toBe(false);
    expect(result.canPersistProviderPayload).toBe(false);
    expect(result.hasToken).toBe(false);
  });
});

describe("provider connection verification safety", () => {
  it("serialized result does not contain secrets, tokens, or provider payloads", () => {
    const result = createProviderConnectionVerificationResult({
      provider: "gmail",
      runtime: "nango",
      state: "connected",
      checkedAt,
    });
    const serialized = JSON.stringify(result);

    expect(serialized).not.toMatch(/access_token/i);
    expect(serialized).not.toMatch(/refresh_token/i);
    expect(serialized).not.toMatch(/client_secret/i);
    expect(serialized).not.toMatch(/"providerPayload"/i);
    expect(serialized).not.toMatch(/raw email body/i);
    expect(serialized).not.toMatch(/raw calendar description/i);
    expect(serialized).not.toMatch(/meetingLink/i);
    expect(isProviderConnectionVerificationResultSafeForClient(result)).toBe(true);
  });

  it("rejects adulterated verification result", () => {
    const result = createProviderConnectionVerificationResult({
      provider: "gmail",
      runtime: "nango",
      state: "connected",
      checkedAt,
    });

    const tampered = {
      ...result,
      hasToken: true as unknown as false,
    };

    expect(isProviderConnectionVerificationResultSafeForClient(tampered)).toBe(false);
  });

  it("rejects result with forbidden message content", () => {
    const result = createProviderConnectionVerificationResult({
      provider: "gmail",
      runtime: "nango",
      state: "error",
      checkedAt,
      messages: ["access_token leaked"],
    });

    expect(isProviderConnectionVerificationResultSafeForClient(result)).toBe(false);
  });
});
