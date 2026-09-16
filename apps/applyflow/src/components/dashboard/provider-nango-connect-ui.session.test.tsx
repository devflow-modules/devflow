// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import {
  PROVIDER_NANGO_CONNECT_START_LABEL,
  ProviderNangoConnectUi,
} from "./provider-nango-connect-ui";
import type { NangoConnectUiEvent, OpenNangoConnectUiFn } from "./provider-nango-connect-client";

const readyLauncherResult = {
  safeForClient: true as const,
  status: "oauth_start_ready" as const,
  provider: "gmail" as const,
  runtime: "nango" as const,
  canStartOAuth: true,
  connectSessionToken: "client-safe-connect-session-token",
  connectSessionUrl: "/provider-runtime/nango/connect?provider=gmail",
  messages: ["OAuth may start when server gates allow."],
  reasons: [],
};

afterEach(() => {
  cleanup();
});

describe("ProviderNangoConnectUi session reset", () => {
  it("ignora o evento de conexão depois de o provider mudar", async () => {
    let onEvent: ((event: NangoConnectUiEvent) => void) | undefined;
    let releaseOpen: () => void = () => undefined;
    const openNangoConnectUi: OpenNangoConnectUiFn = async (input) => {
      onEvent = input.onEvent;
      await new Promise<void>((resolve) => {
        releaseOpen = resolve;
      });
    };

    const { rerender } = render(
      <ProviderNangoConnectUi
        provider="gmail"
        explicitConsentChecked={true}
        launcherResult={readyLauncherResult}
        openNangoConnectUi={openNangoConnectUi}
      />,
    );

    fireEvent.click(screen.getByTestId("provider-nango-connect-start-button"));
    expect(screen.getByText("Opening Nango Connect…")).toBeTruthy();

    rerender(
      <ProviderNangoConnectUi
        provider="calendar"
        explicitConsentChecked={true}
        launcherResult={{ ...readyLauncherResult, provider: "calendar" }}
        openNangoConnectUi={openNangoConnectUi}
      />,
    );

    expect(screen.getByText(PROVIDER_NANGO_CONNECT_START_LABEL)).toBeTruthy();
    onEvent?.({ type: "connect" });

    try {
      await waitFor(() => {
        expect(screen.queryByTestId("provider-nango-connect-completed")).toBeNull();
        expect(screen.getByText(PROVIDER_NANGO_CONNECT_START_LABEL)).toBeTruthy();
      });
    } finally {
      releaseOpen();
    }
  });
});
