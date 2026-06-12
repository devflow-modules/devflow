import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  createProviderConnectionActionMock,
  createProviderConnectionActionSnapshot,
} from "../src/provider-connection-action/action.js";
import type {
  ProviderConnectionActionRequest,
  ProviderConnectionActionResult,
} from "../src/provider-connection-action/types.js";
import type { ProviderRuntimeFlagMap } from "../src/provider-runtime-flags/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const allFlagsOff: ProviderRuntimeFlagMap = {};

const allFlagsOn: ProviderRuntimeFlagMap = {
  CAREER_PROVIDER_RUNTIME_ENABLED: "true",
  NANGO_RUNTIME_ENABLED: "true",
  GMAIL_PROVIDER_ENABLED: "true",
  CALENDAR_PROVIDER_ENABLED: "true",
};

const explicitConsent = {
  hasExplicitConsent: true,
  consentedAt: "2026-06-12T10:00:00.000Z",
  scopes: ["gmail.metadata.read"],
};

const connectGmailRequest = {
  action: "connect",
  provider: "gmail",
  runtime: "nango",
  flags: allFlagsOn,
  consent: explicitConsent,
  requestedAt: "2026-06-12T10:05:00.000Z",
} satisfies ProviderConnectionActionRequest;

function expectMockSafetyFlags(result: ProviderConnectionActionResult) {
  expect(result.runtimeDisabled).toBe(true);
  expect(result.canStartOAuth).toBe(false);
  expect(result.canCallProvider).toBe(false);
  expect(result.canStoreToken).toBe(false);
  expect(result.canPersistProviderData).toBe(false);
  expect(result.userReviewRequired).toBe(true);
}

describe("createProviderConnectionActionMock", () => {
  it("returns blocked for connect when flags are off", () => {
    const result = createProviderConnectionActionMock({
      ...connectGmailRequest,
      flags: allFlagsOff,
    });

    expect(result.status).toBe("blocked");
    expect(result.mode).toBe("mock");
    expectMockSafetyFlags(result);
  });

  it("returns mocked with runtimeDisabled when flags and consent allow connect", () => {
    const result = createProviderConnectionActionMock(connectGmailRequest);

    expect(result.status).toBe("mocked");
    expect(result.mode).toBe("mock");
    expectMockSafetyFlags(result);
    expect(result.runtimeResult.status).toBe("disabled");
  });

  it("never allows OAuth on connect", () => {
    const result = createProviderConnectionActionMock(connectGmailRequest);
    expect(result.canStartOAuth).toBe(false);
  });

  it("never allows provider calls on connect", () => {
    const result = createProviderConnectionActionMock(connectGmailRequest);
    expect(result.canCallProvider).toBe(false);
  });

  it("never allows token storage on connect", () => {
    const result = createProviderConnectionActionMock(connectGmailRequest);
    expect(result.canStoreToken).toBe(false);
  });

  it("never persists provider data on connect", () => {
    const result = createProviderConnectionActionMock(connectGmailRequest);
    expect(result.canPersistProviderData).toBe(false);
  });

  it("keeps connect snapshot not_connected", () => {
    const result = createProviderConnectionActionMock(connectGmailRequest);
    expect(result.connectionSnapshot.status).toBe("not_connected");
  });

  it("does not set connectedAt on connect", () => {
    const result = createProviderConnectionActionMock(connectGmailRequest);
    expect(result.connectionSnapshot.connectedAt).toBeUndefined();
  });

  it("returns revoked mock snapshot for revoke", () => {
    const result = createProviderConnectionActionMock({
      ...connectGmailRequest,
      action: "revoke",
    });

    expect(result.connectionSnapshot.status).toBe("revoked");
    expect(result.mode).toBe("read_only");
    expect(result.connectionSnapshot.capability.canDeleteDerivedData).toBe(true);
  });

  it("sets revokedAt from requestedAt on revoke", () => {
    const result = createProviderConnectionActionMock({
      ...connectGmailRequest,
      action: "revoke",
    });

    expect(result.connectionSnapshot.revokedAt).toBe(connectGmailRequest.requestedAt);
  });

  it("returns empty scopes on delete_derived_data", () => {
    const result = createProviderConnectionActionMock({
      ...connectGmailRequest,
      action: "delete_derived_data",
    });

    expect(result.connectionSnapshot.scopes).toEqual([]);
    expect(result.connectionSnapshot.status).toBe("not_connected");
  });

  it("does not allow persistence on delete_derived_data", () => {
    const result = createProviderConnectionActionMock({
      ...connectGmailRequest,
      action: "delete_derived_data",
    });

    expect(result.canPersistProviderData).toBe(false);
    expect(result.connectionSnapshot.capability.canDeleteDerivedData).toBe(false);
  });

  it("includes explicit mock/read-only messages", () => {
    const result = createProviderConnectionActionMock(connectGmailRequest);

    expect(result.messages.join(" ")).toMatch(/mock\/read-only/i);
    expect(result.messages.join(" ")).toMatch(/runtime is disabled/i);
    expect(result.messages.join(" ")).toMatch(/No OAuth was started/i);
    expect(result.messages.join(" ")).toMatch(/No provider call was made/i);
    expect(result.messages.join(" ")).toMatch(/No token was stored/i);
  });

  it("includes disabled runtime result", () => {
    const result = createProviderConnectionActionMock(connectGmailRequest);

    expect(result.runtimeResult).toBeDefined();
    expect(result.runtimeResult.status).toBe("disabled");
    expect(result.runtimeResult.provider).toBe("gmail");
    expect(result.runtimeResult.runtime).toBe("nango");
  });

  it("supports calendar provider", () => {
    const result = createProviderConnectionActionMock({
      ...connectGmailRequest,
      provider: "calendar",
      consent: {
        ...explicitConsent,
        scopes: ["calendar.events.read"],
      },
    });

    expect(result.provider).toBe("calendar");
    expect(result.connectionSnapshot.provider).toBe("calendar");
  });

  it("blocks unsupported runtime via disabled runtime shell", () => {
    const result = createProviderConnectionActionMock({
      ...connectGmailRequest,
      runtime: "sandbox",
    });

    expect(result.status).toBe("blocked");
    expect(result.runtimeResult.reasons).toContain("unsupported_runtime");
  });

  it("returns deterministic JSON for the same input", () => {
    const first = createProviderConnectionActionMock(connectGmailRequest);
    const second = createProviderConnectionActionMock(connectGmailRequest);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});

describe("createProviderConnectionActionSnapshot", () => {
  it("sorts scopes deterministically for connect", () => {
    const snapshot = createProviderConnectionActionSnapshot({
      ...connectGmailRequest,
      consent: {
        ...explicitConsent,
        scopes: ["z.scope", "a.scope"],
      },
    });

    expect(snapshot.scopes).toEqual(["a.scope", "z.scope"]);
  });
});

describe("provider connection action mock safety", () => {
  it("does not read process.env in action module source", () => {
    const actionSource = readFileSync(
      join(__dirname, "../src/provider-connection-action/action.ts"),
      "utf8",
    );
    const typesSource = readFileSync(
      join(__dirname, "../src/provider-connection-action/types.ts"),
      "utf8",
    );

    expect(actionSource).not.toMatch(/process\.env/);
    expect(typesSource).not.toMatch(/process\.env/);
  });

  it("does not use fetch or network calls in action module source", () => {
    const actionSource = readFileSync(
      join(__dirname, "../src/provider-connection-action/action.ts"),
      "utf8",
    );

    expect(actionSource).not.toMatch(/fetch\s*\(/);
    expect(actionSource).not.toMatch(/axios/);
    expect(actionSource).not.toMatch(/googleapis/);
  });

  it("does not import real Nango SDK in action module source", () => {
    const actionSource = readFileSync(
      join(__dirname, "../src/provider-connection-action/action.ts"),
      "utf8",
    );

    expect(actionSource).not.toMatch(/from\s+['"]nango/);
  });

  it("does not contain token fields in action types", () => {
    const typesSource = readFileSync(
      join(__dirname, "../src/provider-connection-action/types.ts"),
      "utf8",
    );

    expect(typesSource).not.toMatch(/access_token|refresh_token|client_secret|providerPayload/);
  });

  it("result JSON does not contain raw provider payload or meeting links", () => {
    const result = createProviderConnectionActionMock(connectGmailRequest);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toMatch(/access_token|refresh_token|client_secret|providerPayload/);
    expect(serialized).not.toMatch(/hangoutLink|htmlLink|meetingLink|rawBody|rawDescription/i);
    expect(serialized).not.toMatch(/@gmail\.com|@google\.com/);
  });
});
