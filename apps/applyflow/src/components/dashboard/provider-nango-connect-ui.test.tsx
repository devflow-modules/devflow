import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  mapNangoConnectUiEventToStatus,
  PROVIDER_NANGO_CONNECT_START_LABEL,
  ProviderNangoConnectUi,
  resolveNangoConnectUiAvailability,
} from "./provider-nango-connect-ui";

const blockedLauncherResult = {
  safeForClient: true as const,
  status: "blocked" as const,
  provider: "gmail" as const,
  runtime: "nango" as const,
  canStartOAuth: false,
  messages: ["Runtime flags are disabled by default."],
  reasons: ["career_provider_runtime_disabled"],
};

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

describe("resolveNangoConnectUiAvailability", () => {
  it("returns idle before consent or launcher result", () => {
    expect(
      resolveNangoConnectUiAvailability({
        explicitConsentChecked: false,
        launcherResult: null,
      }),
    ).toBe("idle");
  });

  it("returns unavailable when launcher is blocked", () => {
    expect(
      resolveNangoConnectUiAvailability({
        explicitConsentChecked: true,
        launcherResult: blockedLauncherResult,
      }),
    ).toBe("unavailable");
  });

  it("returns available when launcher is oauth_start_ready with session token", () => {
    expect(
      resolveNangoConnectUiAvailability({
        explicitConsentChecked: true,
        launcherResult: readyLauncherResult,
      }),
    ).toBe("available");
  });
});

describe("mapNangoConnectUiEventToStatus", () => {
  it("maps connect, close, and error events", () => {
    expect(mapNangoConnectUiEventToStatus({ type: "connect" }, "starting")).toBe("completed");
    expect(mapNangoConnectUiEventToStatus({ type: "close" }, "starting")).toBe("cancelled");
    expect(mapNangoConnectUiEventToStatus({ type: "error" }, "starting")).toBe("error");
  });
});

describe("ProviderNangoConnectUi render", () => {
  it("does not render before explicit consent", () => {
    const html = renderToStaticMarkup(
      <ProviderNangoConnectUi
        explicitConsentChecked={false}
        launcherResult={readyLauncherResult}
        openNangoConnectUi={vi.fn()}
      />,
    );

    expect(html).toBe("");
  });

  it("shows Connect UI unavailable when launcher is blocked", () => {
    const html = renderToStaticMarkup(
      <ProviderNangoConnectUi
        explicitConsentChecked={true}
        launcherResult={blockedLauncherResult}
        openNangoConnectUi={vi.fn()}
      />,
    );

    expect(html).toContain("Connect UI unavailable");
    expect(html).not.toContain(PROVIDER_NANGO_CONNECT_START_LABEL);
  });

  it("shows Start Nango Connect when launcher is oauth_start_ready", () => {
    const html = renderToStaticMarkup(
      <ProviderNangoConnectUi
        explicitConsentChecked={true}
        launcherResult={readyLauncherResult}
        openNangoConnectUi={vi.fn()}
      />,
    );

    expect(html).toContain("Nango Connect available");
    expect(html).toContain(PROVIDER_NANGO_CONNECT_START_LABEL);
    expect(html).toContain("oauth_start_ready");
    expect(html).not.toMatch(/NANGO_SECRET_KEY/);
    expect(html).not.toMatch(/access_token/);
    expect(html).not.toMatch(/refresh_token/);
    expect(html).not.toMatch(/client-safe-connect-session-token/);
  });
});

describe("provider nango connect ui safety", () => {
  it("source files do not use browser storage APIs", async () => {
    const uiSource = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("./provider-nango-connect-ui.tsx", import.meta.url), "utf8"),
    );
    const clientSource = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("./provider-nango-connect-client.ts", import.meta.url), "utf8"),
    );

    expect(uiSource).not.toMatch(/localStorage\.|sessionStorage\./);
    expect(clientSource).not.toMatch(/localStorage\.|sessionStorage\./);
  });
});
