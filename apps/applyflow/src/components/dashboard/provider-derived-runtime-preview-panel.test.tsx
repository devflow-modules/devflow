import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PROVIDER_DERIVED_RUNTIME_PREVIEW_BUTTON_LABEL,
  PROVIDER_DERIVED_RUNTIME_PREVIEW_TITLE,
} from "./provider-derived-runtime-preview-content";
import { ProviderDerivedRuntimePreviewPanel } from "./provider-derived-runtime-preview-panel";

const connectedVerification = (provider: "gmail" | "calendar") => ({
  provider,
  runtime: "nango" as const,
  state: "connected" as const,
  verifiedByServer: true as const,
  safeForClient: true as const,
  canSync: false as const,
  canImportProviderData: false as const,
  canPersistProviderPayload: false as const,
  hasToken: false as const,
  checkedAt: "2026-06-15T12:00:00.000Z",
  messages: ["verified"],
  warnings: [],
});

describe("ProviderDerivedRuntimePreviewPanel render", () => {
  it("renders idle preview panel with required labels", () => {
    const html = renderToStaticMarkup(
      <ProviderDerivedRuntimePreviewPanel
        explicitConsentChecked={false}
        gmailVerification={null}
        calendarVerification={null}
      />,
    );

    expect(html).toContain(PROVIDER_DERIVED_RUNTIME_PREVIEW_TITLE);
    expect(html).toContain(PROVIDER_DERIVED_RUNTIME_PREVIEW_BUTTON_LABEL);
    expect(html).toContain("No raw provider data retained");
    expect(html).toContain("No CareerBundle changes");
    expect(html).toContain('disabled=""');
    expect(html).not.toMatch(/access_token|connectionId|providerPayload/i);
  });

  it("enables preview button when consent and both verifications are connected", () => {
    const html = renderToStaticMarkup(
      <ProviderDerivedRuntimePreviewPanel
        explicitConsentChecked={true}
        gmailVerification={connectedVerification("gmail")}
        calendarVerification={connectedVerification("calendar")}
      />,
    );

    expect(html).not.toContain('disabled=""');
  });

  it("keeps preview button disabled without Gmail verification", () => {
    const html = renderToStaticMarkup(
      <ProviderDerivedRuntimePreviewPanel
        explicitConsentChecked={true}
        gmailVerification={null}
        calendarVerification={connectedVerification("calendar")}
      />,
    );

    expect(html).toContain('disabled=""');
  });

  it("keeps preview button disabled without Calendar verification", () => {
    const html = renderToStaticMarkup(
      <ProviderDerivedRuntimePreviewPanel
        explicitConsentChecked={true}
        gmailVerification={connectedVerification("gmail")}
        calendarVerification={null}
      />,
    );

    expect(html).toContain('disabled=""');
  });
});

describe("ProviderDerivedRuntimePreviewPanel client module boundaries", () => {
  it("does not reference browser storage in panel source", async () => {
    const panelSource = await import("./provider-derived-runtime-preview-panel.tsx?raw").catch(
      () => null,
    );
    const clientSource = await import("./provider-derived-runtime-preview-client.ts?raw").catch(
      () => null,
    );

    if (panelSource && "default" in panelSource) {
      expect(String(panelSource.default)).not.toMatch(/localStorage|sessionStorage|setInterval/i);
    }

    if (clientSource && "default" in clientSource) {
      expect(String(clientSource.default)).not.toMatch(/localStorage|sessionStorage/i);
    }
  });
});