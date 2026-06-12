import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PROVIDER_CONSENT_MOCK_ACTIONS,
  PROVIDER_CONSENT_MOCK_BADGE,
  PROVIDER_CONSENT_MOCK_DESCRIPTION,
  PROVIDER_CONSENT_MOCK_PROVIDERS,
  PROVIDER_CONSENT_MOCK_TITLE,
} from "./provider-consent-mock-content";
import { ProviderConsentMockPanel } from "./provider-consent-mock-panel";

describe("ProviderConsentMockPanel content", () => {
  it("defines mock title and read-only badge", () => {
    expect(PROVIDER_CONSENT_MOCK_TITLE).toBe("Provider consent preview");
    expect(PROVIDER_CONSENT_MOCK_BADGE).toContain("Mock");
    expect(PROVIDER_CONSENT_MOCK_BADGE).toContain("Read-only");
  });

  it("shows Gmail and Calendar as not connected", () => {
    const gmail = PROVIDER_CONSENT_MOCK_PROVIDERS.find((p) => p.id === "gmail");
    const calendar = PROVIDER_CONSENT_MOCK_PROVIDERS.find((p) => p.id === "calendar");
    expect(gmail?.status).toBe("Not connected");
    expect(calendar?.status).toBe("Not connected");
  });

  it("states OAuth and provider APIs are not active", () => {
    expect(PROVIDER_CONSENT_MOCK_DESCRIPTION).toMatch(/No OAuth/i);
    expect(PROVIDER_CONSENT_MOCK_DESCRIPTION).toMatch(/Nango runtime/i);
    expect(PROVIDER_CONSENT_MOCK_DESCRIPTION).toMatch(/Gmail API/i);
    expect(PROVIDER_CONSENT_MOCK_DESCRIPTION).toMatch(/Calendar API/i);
  });

  it("lists allowed derived signals and forbidden data", () => {
    const gmail = PROVIDER_CONSENT_MOCK_PROVIDERS.find((p) => p.id === "gmail");
    const calendar = PROVIDER_CONSENT_MOCK_PROVIDERS.find((p) => p.id === "calendar");
    expect(gmail?.allowedSignals).toContain("recruiter screening");
    expect(gmail?.neverStored).toContain("raw body");
    expect(gmail?.neverStored).toContain("tokens");
    expect(calendar?.allowedSignals).toContain("interview event");
    expect(calendar?.neverStored).toContain("meeting links");
    expect(calendar?.neverStored).toContain("tokens");
  });

  it("marks connect/revoke/delete actions as coming soon", () => {
    for (const action of PROVIDER_CONSENT_MOCK_ACTIONS) {
      expect(action.label).toMatch(/Coming soon/i);
    }
  });
});

describe("ProviderConsentMockPanel render", () => {
  it("renders title, mock badge, and provider statuses", () => {
    const html = renderToStaticMarkup(<ProviderConsentMockPanel />);
    expect(html).toContain("Provider consent preview");
    expect(html).toContain("Mock · Read-only · No provider connection");
    expect(html).toContain("Gmail");
    expect(html).toContain("Calendar");
    expect(html).toContain("Not connected");
    expect(html).toContain("No OAuth");
    expect(html).toContain("Nango runtime");
    expect(html).toContain("Gmail API");
    expect(html).toContain("Calendar API");
  });

  it("renders disabled action buttons", () => {
    const html = renderToStaticMarkup(<ProviderConsentMockPanel />);
    expect(html).toContain("Connect Gmail — Coming soon");
    expect(html).toContain("Connect Calendar — Coming soon");
    expect(html).toContain("Revoke access — Coming soon");
    expect(html).toContain("Delete derived data — Coming soon");
    expect(html).toMatch(/disabled/);
    expect(html).not.toMatch(/fetch\(/);
  });

  it("does not include token or provider SDK fields in markup", () => {
    const html = renderToStaticMarkup(<ProviderConsentMockPanel />);
    expect(html).not.toMatch(/access_token/);
    expect(html).not.toMatch(/refresh_token/);
    expect(html).not.toMatch(/providerToken/);
    expect(html).not.toMatch(/googleapis/);
  });
});
