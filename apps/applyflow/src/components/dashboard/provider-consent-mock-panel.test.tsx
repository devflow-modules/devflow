import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { runProviderConsentActionMock } from "./provider-consent-action-mock";
import {
  PROVIDER_CONSENT_MOCK_ACTIONS,
  PROVIDER_CONSENT_MOCK_BADGE,
  PROVIDER_CONSENT_MOCK_DESCRIPTION,
  PROVIDER_CONSENT_MOCK_TITLE,
} from "./provider-consent-mock-content";
import {
  formatProviderConnectionStatusLabel,
  getProviderConsentMockCapabilities,
  providerConsentMockConnections,
} from "./provider-consent-mock-data";
import {
  ProviderConsentMockActionResultPreview,
  ProviderConsentMockPanel,
} from "./provider-consent-mock-panel";

describe("providerConsentMockConnections", () => {
  it("uses ProviderConnectionSnapshot model from career-sync", () => {
    expect(providerConsentMockConnections).toHaveLength(2);
    const gmail = providerConsentMockConnections.find((s) => s.provider === "gmail");
    const calendar = providerConsentMockConnections.find((s) => s.provider === "calendar");
    expect(gmail?.status).toBe("not_connected");
    expect(calendar?.status).toBe("not_connected");
    expect(gmail?.runtime).toBe("sandbox");
    expect(calendar?.runtime).toBe("sandbox");
    expect(gmail?.scopes).toEqual(["gmail.metadata.read"]);
    expect(calendar?.scopes).toEqual(["calendar.events.read"]);
  });

  it("exposes safe capability defaults for not_connected snapshots", () => {
    for (const snapshot of providerConsentMockConnections) {
      const capabilities = getProviderConsentMockCapabilities(snapshot);
      expect(capabilities.canSync).toBe(false);
      expect(capabilities.canRevoke).toBe(false);
      expect(capabilities.canDeleteDerivedData).toBe(false);
      expect(capabilities.userReviewRequired).toBe(true);
    }
  });

  it("formats not_connected status label", () => {
    expect(formatProviderConnectionStatusLabel("not_connected")).toBe("Not connected");
  });
});

describe("ProviderConsentMockPanel content", () => {
  it("defines mock title and read-only badge", () => {
    expect(PROVIDER_CONSENT_MOCK_TITLE).toBe("Provider consent preview");
    expect(PROVIDER_CONSENT_MOCK_BADGE).toContain("Mock");
    expect(PROVIDER_CONSENT_MOCK_BADGE).toContain("Read-only");
  });

  it("states OAuth and provider APIs are not active", () => {
    expect(PROVIDER_CONSENT_MOCK_DESCRIPTION).toMatch(/No OAuth/i);
    expect(PROVIDER_CONSENT_MOCK_DESCRIPTION).toMatch(/Nango runtime/i);
    expect(PROVIDER_CONSENT_MOCK_DESCRIPTION).toMatch(/Gmail API/i);
    expect(PROVIDER_CONSENT_MOCK_DESCRIPTION).toMatch(/Calendar API/i);
  });

  it("marks preview actions as preview only", () => {
    for (const action of PROVIDER_CONSENT_MOCK_ACTIONS) {
      expect(action.label).toMatch(/Preview only/i);
    }
  });
});

describe("ProviderConsentMockPanel render", () => {
  it("renders panel from provider connection snapshots", () => {
    const html = renderToStaticMarkup(<ProviderConsentMockPanel />);
    expect(html).toContain("Provider consent preview");
    expect(html).toContain("Mock · Read-only · No provider connection");
    expect(html).toContain("Gmail");
    expect(html).toContain("Calendar");
    expect(html).toContain("Not connected");
    expect(html).toContain("Sandbox");
    expect(html).toContain("gmail.metadata.read");
    expect(html).toContain("calendar.events.read");
  });

  it("renders capability fields from the connection model", () => {
    const html = renderToStaticMarkup(<ProviderConsentMockPanel />);
    expect(html).toContain("Can sync:");
    expect(html).toContain("Can revoke:");
    expect(html).toContain("Can delete derived data:");
    expect(html).toContain("User review required:");
    expect(html).toMatch(/Can sync:[\s\S]*No/);
    expect(html).toMatch(/Can revoke:[\s\S]*No/);
    expect(html).toMatch(/Can delete derived data:[\s\S]*No/);
    expect(html).toMatch(/User review required:[\s\S]*Yes/);
  });

  it("renders preview action buttons and safety boundaries", () => {
    const html = renderToStaticMarkup(<ProviderConsentMockPanel />);
    expect(html).toContain("Connect Gmail — Preview only");
    expect(html).toContain("Connect Calendar — Preview only");
    expect(html).toContain("Revoke access — Preview only");
    expect(html).toContain("Delete derived data — Preview only");
    expect(html).toContain("Preview actions · Local simulation only");
    expect(html).toContain("No OAuth started");
    expect(html).toContain("No provider call made");
    expect(html).toContain("No token stored");
    expect(html).toContain("No provider data persisted");
    expect(html).not.toMatch(/aria-disabled="true"/);
    expect(html).not.toMatch(/Coming soon/i);
    expect(html).not.toMatch(/fetch\(/);
  });

  it("does not include tokens, provider payloads, or raw email/calendar content", () => {
    const html = renderToStaticMarkup(<ProviderConsentMockPanel />);
    expect(html).not.toMatch(/access_token/);
    expect(html).not.toMatch(/refresh_token/);
    expect(html).not.toMatch(/providerToken/);
    expect(html).not.toMatch(/providerPayload/);
    expect(html).not.toMatch(/googleapis/);
    expect(html).not.toContain("raw email body");
    expect(html).not.toContain("raw calendar description");
  });
});

describe("ProviderConsentMockActionResultPreview", () => {
  it("renders blocked Gmail connect mock result with runtime disabled", () => {
    const result = runProviderConsentActionMock("connect", "gmail");
    const html = renderToStaticMarkup(<ProviderConsentMockActionResultPreview result={result} />);

    expect(html).toContain("Mock action result");
    expect(html).toContain("blocked");
    expect(html).toContain("Runtime disabled:");
    expect(html).toMatch(/Runtime disabled:[\s\S]*Yes/);
    expect(html).toMatch(/OAuth started:[\s\S]*No/);
    expect(html).toMatch(/Provider call:[\s\S]*No/);
    expect(html).toMatch(/Token stored:[\s\S]*No/);
    expect(html).toMatch(/Provider data persisted:[\s\S]*No/);
    expect(html).toContain("not_connected");
    expect(html).toContain("career_provider_runtime_disabled");
  });

  it("renders Calendar connect preview result", () => {
    const result = runProviderConsentActionMock("connect", "calendar");
    const html = renderToStaticMarkup(<ProviderConsentMockActionResultPreview result={result} />);

    expect(html).toContain("blocked");
    expect(html).toContain("not_connected");
  });

  it("renders revoke preview snapshot details", () => {
    const result = runProviderConsentActionMock("revoke", "gmail");
    const html = renderToStaticMarkup(<ProviderConsentMockActionResultPreview result={result} />);

    expect(html).toContain("revoked");
    expect(html).toMatch(/Derived data deletion available:[\s\S]*Yes/);
  });
});
