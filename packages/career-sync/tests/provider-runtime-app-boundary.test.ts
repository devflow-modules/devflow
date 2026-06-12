import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  createProviderRuntimeAppBoundaryResult,
  isProviderRuntimeAppBoundaryResultSafeForClient,
} from "../src/provider-runtime-app-boundary/boundary.js";
import type { ProviderRuntimeAppBoundaryRequest } from "../src/provider-runtime-app-boundary/types.js";
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

const baseRequest = {
  action: "connect",
  provider: "gmail",
  runtime: "nango",
  flags: allFlagsOn,
  consent: explicitConsent,
  requestedAt: "2026-06-12T10:05:00.000Z",
  source: "applyflow",
} satisfies ProviderRuntimeAppBoundaryRequest;

describe("createProviderRuntimeAppBoundaryResult", () => {
  it("returns blocked with disabled mode when flags are off", () => {
    const result = createProviderRuntimeAppBoundaryResult({
      ...baseRequest,
      flags: allFlagsOff,
    });

    expect(result.status).toBe("blocked");
    expect(result.mode).toBe("disabled");
    expect(result.actionResult.status).toBe("blocked");
  });

  it("returns mocked with mock mode when action mock returns mocked", () => {
    const result = createProviderRuntimeAppBoundaryResult(baseRequest);

    expect(result.status).toBe("mocked");
    expect(result.mode).toBe("mock");
    expect(result.actionResult.status).toBe("mocked");
  });

  it("never allows OAuth, provider calls, token storage, or persistence", () => {
    const result = createProviderRuntimeAppBoundaryResult(baseRequest);

    expect(result.canStartOAuth).toBe(false);
    expect(result.canCallProvider).toBe(false);
    expect(result.canStoreToken).toBe(false);
    expect(result.canPersistProviderData).toBe(false);
  });

  it("always sets safeForClient and userReviewRequired", () => {
    const blocked = createProviderRuntimeAppBoundaryResult({
      ...baseRequest,
      flags: allFlagsOff,
    });
    const mocked = createProviderRuntimeAppBoundaryResult(baseRequest);

    expect(blocked.safeForClient).toBe(true);
    expect(blocked.userReviewRequired).toBe(true);
    expect(mocked.safeForClient).toBe(true);
    expect(mocked.userReviewRequired).toBe(true);
  });

  it("preserves applyflow source", () => {
    const result = createProviderRuntimeAppBoundaryResult(baseRequest);
    expect(result.source).toBe("applyflow");
  });

  it("preserves interview_lab source", () => {
    const result = createProviderRuntimeAppBoundaryResult({
      ...baseRequest,
      source: "interview_lab",
    });
    expect(result.source).toBe("interview_lab");
  });

  it("includes explicit safety messages", () => {
    const result = createProviderRuntimeAppBoundaryResult(baseRequest);
    const joined = result.messages.join(" ");

    expect(joined).toMatch(/safe for client/i);
    expect(joined).toMatch(/No OAuth was started/i);
    expect(joined).toMatch(/No provider call was made/i);
    expect(joined).toMatch(/No token was stored/i);
    expect(joined).toMatch(/No provider data was persisted/i);
  });

  it("does not return future_runtime mode in this release", () => {
    const blocked = createProviderRuntimeAppBoundaryResult({
      ...baseRequest,
      flags: allFlagsOff,
    });
    const mocked = createProviderRuntimeAppBoundaryResult(baseRequest);

    expect(blocked.mode).not.toBe("future_runtime");
    expect(mocked.mode).not.toBe("future_runtime");
  });

  it("returns deterministic JSON for the same input", () => {
    const first = createProviderRuntimeAppBoundaryResult(baseRequest);
    const second = createProviderRuntimeAppBoundaryResult(baseRequest);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});

describe("isProviderRuntimeAppBoundaryResultSafeForClient", () => {
  it("returns true for boundary results", () => {
    const result = createProviderRuntimeAppBoundaryResult(baseRequest);
    expect(isProviderRuntimeAppBoundaryResultSafeForClient(result)).toBe(true);
  });
});

describe("provider runtime app boundary safety", () => {
  it("result JSON does not contain tokens, payloads, or raw provider content", () => {
    const result = createProviderRuntimeAppBoundaryResult(baseRequest);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toMatch(/access_token|refresh_token|client_secret|providerPayload/);
    expect(serialized).not.toMatch(/hangoutLink|htmlLink|meetingLink|rawBody|rawDescription/i);
    expect(serialized).not.toMatch(/raw email body|raw calendar description/i);
  });

  it("does not read process.env in boundary module source", () => {
    const boundarySource = readFileSync(
      join(__dirname, "../src/provider-runtime-app-boundary/boundary.ts"),
      "utf8",
    );
    const typesSource = readFileSync(
      join(__dirname, "../src/provider-runtime-app-boundary/types.ts"),
      "utf8",
    );

    expect(boundarySource).not.toMatch(/process\.env/);
    expect(typesSource).not.toMatch(/process\.env/);
  });

  it("does not use fetch, network, or Nango SDK in boundary module source", () => {
    const boundarySource = readFileSync(
      join(__dirname, "../src/provider-runtime-app-boundary/boundary.ts"),
      "utf8",
    );

    expect(boundarySource).not.toMatch(/fetch\s*\(/);
    expect(boundarySource).not.toMatch(/axios/);
    expect(boundarySource).not.toMatch(/googleapis/);
    expect(boundarySource).not.toMatch(/from\s+['"]nango/);
  });
});
