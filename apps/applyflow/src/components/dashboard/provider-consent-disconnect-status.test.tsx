/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProviderConsentConfirmationPanel } from "./provider-consent-confirmation-panel";

const readyLauncherResult = {
  safeForClient: true as const,
  status: "oauth_start_ready" as const,
  provider: "gmail" as const,
  runtime: "nango" as const,
  canStartOAuth: true,
  connectSessionUrl: "/provider-runtime/nango/connect?provider=gmail",
  messages: ["OAuth may start when server gates allow."],
  reasons: [],
};

vi.mock("./provider-consent-launcher-client", () => ({
  buildProviderConsentLauncherUrl: vi.fn(),
  fetchProviderConsentLauncher: vi.fn(),
  runProviderConsentLauncherCheck: vi.fn(async () => ({
    called: true,
    result: readyLauncherResult,
  })),
}));

vi.mock("./provider-nango-connect-client", () => ({
  openNangoConnectUiWithFrontendSdk: vi.fn(),
}));

vi.mock("./provider-derived-runtime-preview-panel", () => ({
  ProviderDerivedRuntimePreviewPanel: () => null,
}));

vi.mock("./provider-connection-disconnect-panel", () => ({
  ProviderConnectionDisconnectPanel: ({
    onDisconnected,
    provider,
  }: {
    onDisconnected: (provider: "gmail" | "calendar") => void;
    provider: "gmail" | "calendar";
  }) => (
    <div
      role="button"
      tabIndex={0}
      data-testid={`provider-disconnect-trigger-${provider}`}
      onClick={() => onDisconnected(provider)}
    >
      Trigger disconnect
    </div>
  ),
}));

describe("ProviderConsentConfirmationPanel disconnect status", () => {
  it("returns the selected provider to not_connected and clears launcher state after disconnect", async () => {
    render(<ProviderConsentConfirmationPanel />);

    fireEvent.click(screen.getByTestId("provider-consent-explicit-checkbox"));
    fireEvent.click(screen.getByTestId("provider-consent-start-button"));

    expect(await screen.findByTestId("provider-consent-launcher-result")).toBeTruthy();

    fireEvent.click(screen.getByTestId("provider-disconnect-trigger-gmail"));

    expect(screen.getByTestId("provider-connection-state").textContent).toBe("not_connected");
    expect(screen.queryByTestId("provider-consent-launcher-result")).toBeNull();
    expect(screen.queryByTestId("provider-verification-error")).toBeNull();

    const html = document.body.innerHTML;
    expect(html).not.toMatch(/access_token|refresh_token|NANGO_SECRET_KEY|sk-/i);
  });
});
