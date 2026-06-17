import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createProviderConnectionVerificationResult } from "@devflow/career-sync";
import {
  PROVIDER_CONNECTION_DISCONNECT_CONFIRM_BODY,
  PROVIDER_CONNECTION_DISCONNECT_CONFIRM_TITLE,
} from "./provider-connection-disconnect-content";
import { ProviderConnectionDisconnectPanel } from "./provider-connection-disconnect-panel";

vi.mock("./provider-connection-disconnect-client", () => ({
  isProviderDisconnectUiEnabled: () => true,
  runProviderConnectionDisconnect: vi.fn(),
}));

const connectedVerification = createProviderConnectionVerificationResult({
  provider: "gmail",
  runtime: "nango",
  state: "connected",
  checkedAt: "2026-06-17T12:00:00.000Z",
});

describe("ProviderConnectionDisconnectPanel", () => {
  it("renders disconnect label and confirmation copy without secrets", () => {
    const html = renderToStaticMarkup(
      <ProviderConnectionDisconnectPanel
        provider="gmail"
        explicitConsentChecked={true}
        verificationResult={connectedVerification}
        onDisconnected={() => undefined}
      />,
    );

    expect(html).toContain("Disconnect Gmail");
    expect(PROVIDER_CONNECTION_DISCONNECT_CONFIRM_TITLE).toMatch(/Disconnect this provider from ApplyFlow/i);
    expect(PROVIDER_CONNECTION_DISCONNECT_CONFIRM_BODY).toMatch(
      /does not necessarily revoke the app directly in your Google Account/i,
    );
    expect(html).not.toMatch(/connectionId|access_token|refresh_token|NANGO_SECRET_KEY/i);
  });

  it("does not expose forbidden identifiers in static markup", () => {
    const html = renderToStaticMarkup(
      <ProviderConnectionDisconnectPanel
        provider="calendar"
        explicitConsentChecked={true}
        verificationResult={createProviderConnectionVerificationResult({
          provider: "calendar",
          runtime: "nango",
          state: "connected",
          checkedAt: "2026-06-17T12:00:00.000Z",
        })}
        onDisconnected={() => undefined}
      />,
    );

    expect(html).toContain("Disconnect Calendar");
    expect(html).not.toMatch(/connection_id|client_secret/i);
  });
});
