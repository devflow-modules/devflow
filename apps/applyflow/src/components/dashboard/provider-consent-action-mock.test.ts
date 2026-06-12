import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildProviderConsentActionRequest,
  formatProviderConsentActionReasons,
  formatProviderConsentActionStatus,
  providerConsentMockFlags,
  runProviderConsentActionMock,
} from "./provider-consent-action-mock";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("runProviderConsentActionMock", () => {
  it("returns blocked status with flags off for Gmail connect preview", () => {
    const result = runProviderConsentActionMock("connect", "gmail");

    expect(result.status).toBe("blocked");
    expect(result.runtimeDisabled).toBe(true);
    expect(result.canStartOAuth).toBe(false);
    expect(result.canCallProvider).toBe(false);
    expect(result.canStoreToken).toBe(false);
    expect(result.canPersistProviderData).toBe(false);
    expect(result.connectionSnapshot.status).toBe("not_connected");
    expect(formatProviderConsentActionReasons(result)).toContain(
      "career_provider_runtime_disabled",
    );
  });

  it("returns blocked status for Calendar connect preview", () => {
    const result = runProviderConsentActionMock("connect", "calendar");

    expect(result.status).toBe("blocked");
    expect(result.provider).toBe("calendar");
    expect(result.connectionSnapshot.provider).toBe("calendar");
  });

  it("returns revoked snapshot for revoke preview", () => {
    const result = runProviderConsentActionMock("revoke", "gmail");

    expect(result.connectionSnapshot.status).toBe("revoked");
    expect(result.connectionSnapshot.capability.canDeleteDerivedData).toBe(true);
  });

  it("returns empty scopes for delete derived data preview", () => {
    const result = runProviderConsentActionMock("delete_derived_data", "gmail");

    expect(result.connectionSnapshot.scopes).toEqual([]);
    expect(result.canPersistProviderData).toBe(false);
  });

  it("uses explicit blocked flags without reading process.env", () => {
    const request = buildProviderConsentActionRequest("connect", "gmail");
    expect(request.flags).toEqual(providerConsentMockFlags);
    expect(request.consent.hasExplicitConsent).toBe(false);
  });

  it("returns deterministic results for the same input", () => {
    const first = runProviderConsentActionMock("connect", "gmail");
    const second = runProviderConsentActionMock("connect", "gmail");

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("formats blocked status label", () => {
    const result = runProviderConsentActionMock("connect", "gmail");
    expect(formatProviderConsentActionStatus(result.status)).toBe("blocked");
  });

  it("does not include tokens or raw provider payload in result JSON", () => {
    const result = runProviderConsentActionMock("connect", "gmail");
    const serialized = JSON.stringify(result);

    expect(serialized).not.toMatch(/access_token|refresh_token|client_secret|providerPayload/);
    expect(serialized).not.toMatch(/hangoutLink|htmlLink|meetingLink|rawBody|rawDescription/i);
  });
});

describe("provider consent action mock safety", () => {
  it("does not read process.env in helper source", () => {
    const source = readFileSync(
      join(__dirname, "./provider-consent-action-mock.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/process\.env/);
    expect(source).not.toMatch(/localStorage|sessionStorage/);
    expect(source).not.toMatch(/fetch\s*\(/);
    expect(source).not.toMatch(/from\s+['"]nango/);
  });
});
