import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  GMAIL_READONLY_MAX_SAFE_MESSAGE_LIMIT,
  GMAIL_SANDBOX_FIXTURE_APPLICATION_DETECTED,
  GMAIL_SANDBOX_FIXTURE_FOLLOW_UP_REQUIRED,
  GMAIL_SANDBOX_FIXTURE_INTERVIEW_LIKELY,
  GMAIL_SANDBOX_FIXTURE_MULTI_SIGNAL,
  GMAIL_SANDBOX_FIXTURE_NO_CAREER_SIGNAL,
  GMAIL_SANDBOX_FIXTURE_OFFER_LIKELY,
  GMAIL_SANDBOX_FIXTURE_RECRUITER_RESPONSE,
  GMAIL_SANDBOX_FIXTURE_REJECTION_LIKELY,
  createGmailReadOnlyAdapterRequest,
  createGmailReadOnlySandboxAdapter,
  createGmailSandboxMetadataProvider,
  deriveGmailSignalsFromEphemeralMetadata,
  getGmailSandboxFixture,
  isGmailReadOnlyAdapterResultSafe,
  type GmailReadOnlyAdapterRequest,
  type GmailReadOnlyMetadataProvider,
} from "../src/gmail-readonly-adapter/index.js";

const requestedAt = "2026-06-15T12:00:00.000Z";

function verifiedSandboxRequest(
  overrides?: Partial<Parameters<typeof createGmailReadOnlyAdapterRequest>[0]>,
): GmailReadOnlyAdapterRequest {
  return createGmailReadOnlyAdapterRequest({
    runtime: "sandbox",
    connectionVerified: true,
    requestedAt,
    ...overrides,
  });
}

function adapterForFixture(fixture = GMAIL_SANDBOX_FIXTURE_APPLICATION_DETECTED) {
  return createGmailReadOnlySandboxAdapter({
    metadataProvider: createGmailSandboxMetadataProvider(fixture),
  });
}

describe("createGmailReadOnlySandboxAdapter", () => {
  it("implements GmailReadOnlyAdapter contract", async () => {
    const adapter = adapterForFixture();
    const result = await adapter.execute(verifiedSandboxRequest());

    expect(result.provider).toBe("gmail");
    expect(result.runtime).toBe("sandbox");
    expect(typeof adapter.execute).toBe("function");
  });

  it("blocks non-sandbox runtime", async () => {
    const adapter = adapterForFixture();
    const result = await adapter.execute(
      createGmailReadOnlyAdapterRequest({
        runtime: "nango",
        connectionVerified: true,
        requestedAt,
      }),
    );

    expect(result.status).toBe("blocked");
    expect(result.warnings.join(" ")).toMatch(/runtime_not_supported|sandbox runtime only/i);
  });

  it("blocks unverified connection", async () => {
    const adapter = adapterForFixture();
    const result = await adapter.execute(
      verifiedSandboxRequest({ connectionVerified: false }),
    );

    expect(result.status).toBe("blocked");
    expect(result.warnings.join(" ")).toMatch(/connection_not_verified/);
  });

  it("blocks unsafe message limit", async () => {
    const adapter = adapterForFixture();
    const result = await adapter.execute(
      verifiedSandboxRequest({
        window: { maxMessages: GMAIL_READONLY_MAX_SAFE_MESSAGE_LIMIT + 1 },
      }),
    );

    expect(result.status).toBe("blocked");
    expect(result.warnings.join(" ")).toMatch(/unsafe_message_limit/);
  });

  it("blocks invalid time window", async () => {
    const adapter = adapterForFixture();
    const result = await adapter.execute(
      verifiedSandboxRequest({
        window: {
          from: "2026-06-15T12:00:00.000Z",
          to: "2026-06-01T12:00:00.000Z",
          maxMessages: 5,
        },
      }),
    );

    expect(result.status).toBe("blocked");
    expect(result.warnings.join(" ")).toMatch(/invalid_time_window/);
  });
});

describe("sandbox fixture classification", () => {
  const cases = [
    { fixture: GMAIL_SANDBOX_FIXTURE_APPLICATION_DETECTED, kind: "application_detected" },
    { fixture: GMAIL_SANDBOX_FIXTURE_INTERVIEW_LIKELY, kind: "interview_likely" },
    { fixture: GMAIL_SANDBOX_FIXTURE_FOLLOW_UP_REQUIRED, kind: "follow_up_required" },
    { fixture: GMAIL_SANDBOX_FIXTURE_RECRUITER_RESPONSE, kind: "recruiter_response_detected" },
    { fixture: GMAIL_SANDBOX_FIXTURE_REJECTION_LIKELY, kind: "rejection_likely" },
    { fixture: GMAIL_SANDBOX_FIXTURE_OFFER_LIKELY, kind: "offer_likely" },
  ] as const;

  for (const { fixture, kind } of cases) {
    it(`fixture ${fixture.fixtureId} generates ${kind}`, async () => {
      const adapter = adapterForFixture(fixture);
      const result = await adapter.execute(verifiedSandboxRequest());

      expect(result.status).toBe("completed");
      expect(result.signals).toHaveLength(1);
      expect(result.signals[0]?.kind).toBe(kind);
      expect(result.signals[0]?.reviewRequired).toBe(true);
      expect(result.signals[0]?.confidence).toBeGreaterThanOrEqual(0);
      expect(result.signals[0]?.confidence).toBeLessThanOrEqual(1);
      expect(isGmailReadOnlyAdapterResultSafe(result)).toBe(true);
    });
  }

  it("fixture without career labels returns empty signals", async () => {
    const adapter = adapterForFixture(GMAIL_SANDBOX_FIXTURE_NO_CAREER_SIGNAL);
    const result = await adapter.execute(verifiedSandboxRequest());

    expect(result.status).toBe("completed");
    expect(result.signals).toHaveLength(0);
    expect(result.processedMessageCount).toBe(1);
  });

  it("produces deterministic output for the same input", async () => {
    const adapter = adapterForFixture(GMAIL_SANDBOX_FIXTURE_MULTI_SIGNAL);
    const request = verifiedSandboxRequest();

    const first = await adapter.execute(request);
    const second = await adapter.execute(request);

    expect(first).toEqual(second);
    expect(first.signals).toHaveLength(2);
    expect(first.signals[0]?.id).toMatch(/^gmail-sandbox-/);
  });

  it("uses deterministic signal IDs and ordering", () => {
    const signals = deriveGmailSignalsFromEphemeralMetadata(GMAIL_SANDBOX_FIXTURE_MULTI_SIGNAL.metadata);

    expect(signals.map((signal) => signal.id)).toEqual([
      "gmail-sandbox-application_detected-2026-06-11T09-00-00-000Z-0",
      "gmail-sandbox-interview_likely-2026-06-11T10-00-00-000Z-1",
    ]);
    expect(signals[0]?.occurredAt.localeCompare(signals[1]?.occurredAt ?? "")).toBeLessThanOrEqual(0);
  });

  it("derives company only from sandbox company labels", async () => {
    const adapter = adapterForFixture(GMAIL_SANDBOX_FIXTURE_APPLICATION_DETECTED);
    const result = await adapter.execute(verifiedSandboxRequest());

    expect(result.signals[0]?.company).toBe("Acme");
  });
});

describe("createGmailSandboxMetadataProvider", () => {
  it("respects limit", async () => {
    const provider = createGmailSandboxMetadataProvider(GMAIL_SANDBOX_FIXTURE_MULTI_SIGNAL);
    const rows = await provider.listMessageMetadata({ limit: 1 });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.occurredAt).toBe("2026-06-11T09:00:00.000Z");
  });

  it("respects from window", async () => {
    const provider = createGmailSandboxMetadataProvider(GMAIL_SANDBOX_FIXTURE_MULTI_SIGNAL);
    const rows = await provider.listMessageMetadata({
      from: "2026-06-11T10:00:00.000Z",
      limit: 10,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.labels).toContain("career.interview");
  });

  it("respects to window", async () => {
    const provider = createGmailSandboxMetadataProvider(GMAIL_SANDBOX_FIXTURE_MULTI_SIGNAL);
    const rows = await provider.listMessageMetadata({
      to: "2026-06-11T09:30:00.000Z",
      limit: 10,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.labels).toContain("career.application");
  });

  it("does not mutate the original fixture", async () => {
    const fixture = getGmailSandboxFixture("gmail-application-detected");
    const originalOccurredAt = fixture.metadata[0]?.occurredAt;
    const provider = createGmailSandboxMetadataProvider(fixture);
    const rows = await provider.listMessageMetadata({ limit: 5 });

    rows[0]!.occurredAt = "2099-01-01T00:00:00.000Z";
    expect(fixture.metadata[0]?.occurredAt).toBe(originalOccurredAt);
  });
});

describe("sandbox adapter safety", () => {
  it("returns sanitized error when metadata provider fails", async () => {
    const failingProvider: GmailReadOnlyMetadataProvider = {
      listMessageMetadata: async () => {
        throw new Error("provider failure with access_token");
      },
    };
    const adapter = createGmailReadOnlySandboxAdapter({ metadataProvider: failingProvider });
    const result = await adapter.execute(verifiedSandboxRequest());

    expect(result.status).toBe("error");
    expect(result.signals).toHaveLength(0);
    expect(result.messages).toContain("Sandbox metadata processing failed safely.");
    expect(JSON.stringify(result)).not.toMatch(/access_token/);
    expect(isGmailReadOnlyAdapterResultSafe(result)).toBe(true);
  });

  it("completed result retains no raw data or tokens", async () => {
    const adapter = adapterForFixture(GMAIL_SANDBOX_FIXTURE_OFFER_LIKELY);
    const result = await adapter.execute(verifiedSandboxRequest());
    const serialized = JSON.stringify(result);

    expect(result.importedRawMessages).toBe(false);
    expect(result.retainedBodies).toBe(false);
    expect(result.retainedSnippets).toBe(false);
    expect(result.retainedAttachments).toBe(false);
    expect(result.hasToken).toBe(false);
    expect(serialized).not.toMatch(/"subject"/i);
    expect(serialized).not.toMatch(/"snippet"/i);
    expect(serialized).not.toMatch(/rawBody/i);
    expect(serialized).not.toMatch(/access_token/i);
    expect(serialized).not.toMatch(/refresh_token/i);
    expect(serialized).not.toMatch(/client_secret/i);
    expect(serialized).not.toMatch(/"providerPayload"/i);
    expect(serialized).not.toMatch(/messageId/i);
    expect(serialized).not.toMatch(/threadId/i);
  });
});

describe("gmail-readonly sandbox boundaries", () => {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const srcDir = join(moduleDir, "../src/gmail-readonly-adapter");
  const sandboxFiles = [
    "sandbox-types.ts",
    "sandbox-fixtures.ts",
    "sandbox-classifier.ts",
    "sandbox-adapter.ts",
  ];

  it("does not import Nango SDK, googleapis, fetch, or process.env", () => {
    const combined = sandboxFiles
      .map((file) => readFileSync(join(srcDir, file), "utf8"))
      .join("\n");

    expect(combined).not.toMatch(/from ['"]@nangohq/);
    expect(combined).not.toMatch(/from ['"]googleapis/);
    expect(combined).not.toMatch(/gmail\.users/);
    expect(combined).not.toMatch(/\bfetch\s*\(/);
    expect(combined).not.toMatch(/process\.env/);
  });

  it("does not use Math.random, randomUUID, or Date.now", () => {
    const combined = sandboxFiles
      .map((file) => readFileSync(join(srcDir, file), "utf8"))
      .join("\n");

    expect(combined).not.toMatch(/Math\.random/);
    expect(combined).not.toMatch(/randomUUID/);
    expect(combined).not.toMatch(/Date\.now/);
  });
});
