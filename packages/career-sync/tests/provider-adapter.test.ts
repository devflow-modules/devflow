import { describe, expect, it } from "vitest";
import type {
  ProviderAdapter,
  ProviderAdapterResult,
  ProviderAdapterSafetyPolicy,
  ProviderNormalizedEvent,
  ProviderNormalizedMessage,
  ProviderSyncRequest,
} from "../src/provider-adapter/types.js";
import {
  assertProviderAdapterResultSafe,
  assertProviderAdapterSafetyPolicy,
  collectProviderAdapterSafetyWarnings,
  createProviderAdapterSafetyPolicy,
  isProviderAdapterSafetyPolicySafe,
} from "../src/provider-adapter/safety.js";

const safeMessage: ProviderNormalizedMessage = {
  id: "adapter-message-demo-001",
  provider: "gmail",
  receivedAt: "2026-06-10T10:00:00.000Z",
  subject: "Recruiter screening scheduled",
  safeSummary: "Recruiter screening signal detected.",
  companyHint: "Acme SaaS Brasil",
  processStageHint: "screening",
  actionRequired: true,
  rawRetained: false,
};

const safeEvent: ProviderNormalizedEvent = {
  id: "adapter-event-demo-001",
  provider: "calendar",
  eventAt: "2026-06-11T15:00:00.000Z",
  title: "Technical interview",
  safeSummary: "Technical interview signal detected.",
  companyHint: "Acme SaaS Brasil",
  processStageHint: "technical",
  actionRequired: false,
  rawRetained: false,
  meetingLinkRetained: false,
};

function buildSandboxSyncRequest(provider: "gmail" | "calendar"): ProviderSyncRequest {
  const now = "2026-06-09T12:00:00.000Z";
  return {
    provider,
    runtime: "sandbox",
    connection: {
      provider,
      runtime: "sandbox",
      status: "connected",
      connectedAt: now,
      accountHint: "demo-account",
    },
    consent: {
      consentedAt: now,
      provider,
      runtime: "sandbox",
      scopes: ["derived-signals-only"],
      userReviewRequired: true,
      canRevoke: true,
      canDeleteDerivedData: true,
    },
    requestedAt: now,
  };
}

function createSandboxGmailAdapter(): ProviderAdapter<ProviderNormalizedMessage> {
  return {
    provider: "gmail",
    runtime: "sandbox",
    async sync(request) {
      return {
        provider: request.provider,
        runtime: request.runtime,
        derived: [safeMessage],
        generatedAt: request.requestedAt,
        safety: createProviderAdapterSafetyPolicy(),
        warnings: [],
      };
    },
  };
}

describe("provider adapter safety policy", () => {
  it("createProviderAdapterSafetyPolicy returns safe flags", () => {
    const policy = createProviderAdapterSafetyPolicy();
    expect(policy).toEqual({
      rawPayloadRetained: false,
      tokensExposedToClient: false,
      meetingLinksRetained: false,
      attachmentsRetained: false,
      providerIdsRetained: false,
      userReviewRequired: true,
    });
  });

  it("isProviderAdapterSafetyPolicySafe returns true for safe policy", () => {
    expect(isProviderAdapterSafetyPolicySafe(createProviderAdapterSafetyPolicy())).toBe(true);
  });

  it("returns false when rawPayloadRetained is true", () => {
    const policy: ProviderAdapterSafetyPolicy = {
      ...createProviderAdapterSafetyPolicy(),
      rawPayloadRetained: true as false,
    };
    expect(isProviderAdapterSafetyPolicySafe(policy)).toBe(false);
  });

  it("returns false when tokensExposedToClient is true", () => {
    const policy: ProviderAdapterSafetyPolicy = {
      ...createProviderAdapterSafetyPolicy(),
      tokensExposedToClient: true as false,
    };
    expect(isProviderAdapterSafetyPolicySafe(policy)).toBe(false);
  });

  it("returns false when meetingLinksRetained is true", () => {
    const policy: ProviderAdapterSafetyPolicy = {
      ...createProviderAdapterSafetyPolicy(),
      meetingLinksRetained: true as false,
    };
    expect(isProviderAdapterSafetyPolicySafe(policy)).toBe(false);
  });

  it("returns false when attachmentsRetained is true", () => {
    const policy: ProviderAdapterSafetyPolicy = {
      ...createProviderAdapterSafetyPolicy(),
      attachmentsRetained: true as false,
    };
    expect(isProviderAdapterSafetyPolicySafe(policy)).toBe(false);
  });

  it("returns false when providerIdsRetained is true", () => {
    const policy: ProviderAdapterSafetyPolicy = {
      ...createProviderAdapterSafetyPolicy(),
      providerIdsRetained: true as false,
    };
    expect(isProviderAdapterSafetyPolicySafe(policy)).toBe(false);
  });

  it("returns false when userReviewRequired is false", () => {
    const policy: ProviderAdapterSafetyPolicy = {
      ...createProviderAdapterSafetyPolicy(),
      userReviewRequired: false as true,
    };
    expect(isProviderAdapterSafetyPolicySafe(policy)).toBe(false);
  });

  it("collectProviderAdapterSafetyWarnings lists violations", () => {
    const policy: ProviderAdapterSafetyPolicy = {
      rawPayloadRetained: true as false,
      tokensExposedToClient: true as false,
      meetingLinksRetained: false,
      attachmentsRetained: false,
      providerIdsRetained: false,
      userReviewRequired: false as true,
    };
    const warnings = collectProviderAdapterSafetyWarnings(policy);
    expect(warnings).toContain("rawPayloadRetained must be false");
    expect(warnings).toContain("tokensExposedToClient must be false");
    expect(warnings).toContain("userReviewRequired must be true");
    expect(warnings.length).toBe(3);
  });

  it("assertProviderAdapterResultSafe returns safe result", () => {
    const result: ProviderAdapterResult<ProviderNormalizedMessage> = {
      provider: "gmail",
      runtime: "sandbox",
      derived: [safeMessage],
      generatedAt: "2026-06-09T12:00:00.000Z",
      safety: createProviderAdapterSafetyPolicy(),
      warnings: [],
    };
    const safe = assertProviderAdapterResultSafe(result);
    expect(safe).not.toBe(result);
    expect(safe.derived).toEqual(result.derived);
    expect(safe.safety).toEqual(result.safety);
  });

  it("assertProviderAdapterResultSafe throws for unsafe result", () => {
    const result: ProviderAdapterResult<ProviderNormalizedMessage> = {
      provider: "gmail",
      runtime: "sandbox",
      derived: [safeMessage],
      generatedAt: "2026-06-09T12:00:00.000Z",
      safety: {
        ...createProviderAdapterSafetyPolicy(),
        meetingLinksRetained: true as false,
      },
      warnings: [],
    };
    expect(() => assertProviderAdapterResultSafe(result)).toThrow(/Unsafe provider adapter safety policy/);
  });

  it("assertProviderAdapterSafetyPolicy throws for unsafe policy", () => {
    expect(() =>
      assertProviderAdapterSafetyPolicy({
        ...createProviderAdapterSafetyPolicy(),
        attachmentsRetained: true as false,
      }),
    ).toThrow(/attachmentsRetained must be false/);
  });
});

describe("provider adapter normalized fixtures", () => {
  it("normalized message fixture does not contain body/threadId/messageId", () => {
    const keys = Object.keys(safeMessage).sort();
    expect(keys).not.toContain("body");
    expect(keys).not.toContain("threadId");
    expect(keys).not.toContain("messageId");
    expect(safeMessage.rawRetained).toBe(false);
    expect(safeMessage.id).toMatch(/^adapter-message-/);
  });

  it("normalized event fixture does not contain description/hangoutLink/htmlLink/attendees", () => {
    const keys = Object.keys(safeEvent).sort();
    expect(keys).not.toContain("description");
    expect(keys).not.toContain("hangoutLink");
    expect(keys).not.toContain("htmlLink");
    expect(keys).not.toContain("attendees");
    expect(safeEvent.rawRetained).toBe(false);
    expect(safeEvent.meetingLinkRetained).toBe(false);
    expect(safeEvent.id).toMatch(/^adapter-event-/);
  });
});

describe("provider adapter sandbox contract", () => {
  it("allows creating a fake sandbox adapter without provider calls", async () => {
    const adapter = createSandboxGmailAdapter();
    const result = await adapter.sync(buildSandboxSyncRequest("gmail"));
    expect(result.provider).toBe("gmail");
    expect(result.runtime).toBe("sandbox");
    expect(result.derived).toHaveLength(1);
    expect(result.derived[0]?.safeSummary).toContain("Recruiter screening");
  });

  it("fake adapter result passes safety policy", async () => {
    const adapter = createSandboxGmailAdapter();
    const result = await adapter.sync(buildSandboxSyncRequest("gmail"));
    const safe = assertProviderAdapterResultSafe(result);
    expect(isProviderAdapterSafetyPolicySafe(safe.safety)).toBe(true);
    expect(collectProviderAdapterSafetyWarnings(safe.safety)).toEqual([]);
  });
});
