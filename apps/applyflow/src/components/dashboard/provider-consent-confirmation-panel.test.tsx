import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PROVIDER_CONSENT_CONFIRMATION_BOUNDARIES,
  PROVIDER_CONSENT_CONFIRMATION_SCOPES,
  PROVIDER_CONSENT_CONFIRMATION_NEVER_STORED,
  PROVIDER_CONSENT_CONFIRMATION_START_BUTTON_LABEL,
  PROVIDER_CONSENT_CONFIRMATION_TITLE,
} from "./provider-consent-confirmation-content";
import {
  ProviderConsentConfirmationPanel,
  ProviderConsentLauncherResultPreview,
} from "./provider-consent-confirmation-panel";
import {
  buildProviderConsentLauncherUrl,
  fetchProviderConsentLauncher,
  runProviderConsentLauncherCheck,
} from "./provider-consent-launcher-client";

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
  connectSessionUrl: "/provider-runtime/nango/connect?provider=gmail",
  messages: ["OAuth may start when server gates allow."],
  reasons: [],
};

describe("provider consent confirmation content", () => {
  it("defines Gmail and Calendar scopes preview", () => {
    expect(PROVIDER_CONSENT_CONFIRMATION_SCOPES.gmail).toEqual(["gmail.metadata.read"]);
    expect(PROVIDER_CONSENT_CONFIRMATION_SCOPES.calendar).toEqual(["calendar.events.read"]);
  });

  it("includes required data boundary explanations", () => {
    expect(PROVIDER_CONSENT_CONFIRMATION_BOUNDARIES).toContain(
      "This does not import Gmail or Calendar data.",
    );
    expect(PROVIDER_CONSENT_CONFIRMATION_BOUNDARIES).toContain("This does not run background sync.");
    expect(PROVIDER_CONSENT_CONFIRMATION_BOUNDARIES).toContain(
      "This does not store OAuth tokens in the browser.",
    );
    expect(PROVIDER_CONSENT_CONFIRMATION_BOUNDARIES).toContain(
      "This does not add provider data to CareerBundle.",
    );
  });
});

describe("provider consent launcher client", () => {
  it("builds launcher URL without secrets or tokens", () => {
    expect(buildProviderConsentLauncherUrl("gmail")).toBe(
      "/provider-runtime/nango/connect?provider=gmail",
    );
    expect(buildProviderConsentLauncherUrl("calendar")).toBe(
      "/provider-runtime/nango/connect?provider=calendar",
    );
  });

  it("does not call launcher when explicit consent is unchecked", async () => {
    const fetchImpl = vi.fn();
    const outcome = await runProviderConsentLauncherCheck({
      explicitConsentChecked: false,
      provider: "gmail",
      fetchImpl,
    });

    expect(outcome).toEqual({ called: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("calls launcher only after explicit consent", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 403,
      json: async () => blockedLauncherResult,
    })) as unknown as typeof fetch;

    const outcome = await runProviderConsentLauncherCheck({
      explicitConsentChecked: true,
      provider: "gmail",
      fetchImpl,
    });

    expect(outcome.called).toBe(true);
    if (outcome.called) {
      expect(outcome.result.status).toBe("blocked");
      expect(outcome.result.reasons).toContain("career_provider_runtime_disabled");
    }
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("returns oauth_start_ready from mocked fetch", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => readyLauncherResult,
    })) as unknown as typeof fetch;

    const result = await fetchProviderConsentLauncher("gmail", fetchImpl);
    expect(result.status).toBe("oauth_start_ready");
    expect(result.canStartOAuth).toBe(true);
  });
});

describe("ProviderConsentConfirmationPanel render", () => {
  it("renders explicit consent panel with providers and runtime", () => {
    const html = renderToStaticMarkup(<ProviderConsentConfirmationPanel />);

    expect(html).toContain(PROVIDER_CONSENT_CONFIRMATION_TITLE);
    expect(html).toContain("Gmail");
    expect(html).toContain("Calendar");
    expect(html).toContain("Nango");
    expect(html).toContain("gmail.metadata.read");
    expect(PROVIDER_CONSENT_CONFIRMATION_SCOPES.calendar).toContain("calendar.events.read");
    expect(html).toContain("raw body, thread ID");
    expect(PROVIDER_CONSENT_CONFIRMATION_NEVER_STORED.calendar).toContain("meeting links");
    expect(html).toContain("This does not import Gmail or Calendar data.");
    expect(html).toContain("Connect UI not enabled");
  });

  it("disables start button until explicit consent checkbox is checked", () => {
    const html = renderToStaticMarkup(<ProviderConsentConfirmationPanel />);

    expect(html).toContain(PROVIDER_CONSENT_CONFIRMATION_START_BUTTON_LABEL);
    expect(html).toMatch(/disabled/);
    expect(html).toContain("I understand and explicitly consent");
  });

  it("does not include secrets, tokens, provider payloads, or raw provider content", () => {
    const html = renderToStaticMarkup(<ProviderConsentConfirmationPanel />);

    expect(html).not.toMatch(/NANGO_SECRET_KEY/);
    expect(html).not.toMatch(/access_token/);
    expect(html).not.toMatch(/refresh_token/);
    expect(html).not.toMatch(/client_secret/);
    expect(html).not.toMatch(/authorization_code/);
    expect(html).not.toMatch(/providerPayload/);
    expect(html).not.toMatch(/googleapis/);
    expect(html).not.toContain("raw email body");
    expect(html).not.toContain("raw calendar description");
  });
});

describe("ProviderConsentLauncherResultPreview", () => {
  it("renders blocked launcher result", () => {
    const html = renderToStaticMarkup(
      <ProviderConsentLauncherResultPreview result={blockedLauncherResult} />,
    );

    expect(html).toContain("Connection launcher result");
    expect(html).toContain("blocked");
    expect(html).toContain("career_provider_runtime_disabled");
    expect(html).toMatch(/Can start OAuth:[\s\S]*No/);
  });

  it("renders oauth_start_ready launcher result without tokens", () => {
    const html = renderToStaticMarkup(
      <ProviderConsentLauncherResultPreview result={readyLauncherResult} />,
    );

    expect(html).toContain("oauth_start_ready");
    expect(html).toMatch(/Can start OAuth:[\s\S]*Yes/);
    expect(html).not.toMatch(/access_token/);
    expect(html).not.toMatch(/refresh_token/);
    expect(html).not.toMatch(/NANGO_SECRET_KEY/);
  });
});

describe("provider consent confirmation safety", () => {
  it("launcher client source does not use localStorage or sessionStorage", async () => {
    const launcherClientSource = await import("node:fs/promises").then((fs) =>
      fs.readFile(
        new URL("./provider-consent-launcher-client.ts", import.meta.url),
        "utf8",
      ),
    );
    const panelSource = await import("node:fs/promises").then((fs) =>
      fs.readFile(
        new URL("./provider-consent-confirmation-panel.tsx", import.meta.url),
        "utf8",
      ),
    );

    expect(launcherClientSource).not.toMatch(/localStorage\.|sessionStorage\./);
    expect(panelSource).not.toMatch(/localStorage\.|sessionStorage\./);
  });
});
