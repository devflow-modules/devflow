import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
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
import { ProviderConsentMockPanel } from "./provider-consent-mock-panel";

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

  it("marks connect/revoke/delete actions as coming soon", () => {
    for (const action of PROVIDER_CONSENT_MOCK_ACTIONS) {
      expect(action.label).toMatch(/Coming soon/i);
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

  it("renders OAuth inactive messaging and disabled Coming soon actions", () => {
    const html = renderToStaticMarkup(<ProviderConsentMockPanel />);
    expect(html).toContain("No OAuth");
    expect(html).toContain("Nango runtime");
    expect(html).toContain("Gmail API");
    expect(html).toContain("Calendar API");
    expect(html).toContain("Connect Gmail — Coming soon");
    expect(html).toContain("Connect Calendar — Coming soon");
    expect(html).toContain("Revoke access — Coming soon");
    expect(html).toContain("Delete derived data — Coming soon");
    expect(html).toMatch(/disabled/);
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
