import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  GMAIL_READONLY_MAX_SAFE_MESSAGE_LIMIT,
  assertGmailReadOnlySafetyPolicy,
  collectGmailReadOnlyAdapterWarnings,
  createBlockedGmailReadOnlyAdapterResult,
  createGmailReadOnlyAdapterRequest,
  createGmailReadOnlyAdapterResult,
  createGmailReadOnlySafetyPolicy,
  evaluateGmailReadOnlyAdapterRequest,
  isGmailReadOnlyAdapterResultSafe,
  isGmailReadOnlySafetyPolicySafe,
  type GmailDerivedSignal,
} from "../src/gmail-readonly-adapter/index.js";

const requestedAt = "2026-06-15T12:00:00.000Z";

const sampleSignal: GmailDerivedSignal = {
  id: "gmail-derived-signal-1",
  kind: "application_detected",
  provider: "gmail",
  occurredAt: requestedAt,
  company: "Example Corp",
  confidence: 0.72,
  reviewRequired: true,
  sourceCount: 2,
};

describe("GmailReadOnlySafetyPolicy", () => {
  it("default policy is read-only and safe", () => {
    const policy = createGmailReadOnlySafetyPolicy();

    expect(policy.readOnly).toBe(true);
    expect(policy.allowRawBodies).toBe(false);
    expect(policy.allowRawSnippets).toBe(false);
    expect(policy.allowAttachments).toBe(false);
    expect(policy.allowRawProviderPayload).toBe(false);
    expect(policy.allowTokenExposure).toBe(false);
    expect(policy.allowMeetingLinks).toBe(false);
    expect(policy.requireVerifiedConnection).toBe(true);
    expect(policy.requireUserReview).toBe(true);
    expect(isGmailReadOnlySafetyPolicySafe(policy)).toBe(true);
    expect(assertGmailReadOnlySafetyPolicy(policy)).toEqual(policy);
  });

  it("rejects unsafe policy mutations", () => {
    const policy = createGmailReadOnlySafetyPolicy();
    const tampered = { ...policy, allowRawBodies: true as unknown as false };

    expect(isGmailReadOnlySafetyPolicySafe(tampered)).toBe(false);
    expect(() => assertGmailReadOnlySafetyPolicy(tampered)).toThrow(/Unsafe Gmail read-only safety policy/);
  });
});

describe("GmailReadOnlyAdapterRequest", () => {
  it("blocks unverified connection", () => {
    const request = createGmailReadOnlyAdapterRequest({
      runtime: "nango",
      connectionVerified: false,
      requestedAt,
    });
    const evaluation = evaluateGmailReadOnlyAdapterRequest(request);

    expect(evaluation.status).toBe("blocked");
    expect(evaluation.reasons).toContain("connection_not_verified");
  });

  it("blocks unsafe message limit", () => {
    const request = createGmailReadOnlyAdapterRequest({
      runtime: "nango",
      connectionVerified: true,
      requestedAt,
      window: { maxMessages: GMAIL_READONLY_MAX_SAFE_MESSAGE_LIMIT + 1 },
    });
    const evaluation = evaluateGmailReadOnlyAdapterRequest(request);

    expect(evaluation.status).toBe("blocked");
    expect(evaluation.reasons).toContain("unsafe_message_limit");
  });

  it("blocks invalid time window", () => {
    const request = createGmailReadOnlyAdapterRequest({
      runtime: "nango",
      connectionVerified: true,
      requestedAt,
      window: {
        from: "2026-06-15T12:00:00.000Z",
        to: "2026-06-01T12:00:00.000Z",
        maxMessages: 10,
      },
    });
    const evaluation = evaluateGmailReadOnlyAdapterRequest(request);

    expect(evaluation.status).toBe("blocked");
    expect(evaluation.reasons).toContain("invalid_time_window");
  });

  it("allows valid verified request", () => {
    const request = createGmailReadOnlyAdapterRequest({
      runtime: "nango",
      connectionVerified: true,
      requestedAt,
      window: { maxMessages: 10 },
    });
    const evaluation = evaluateGmailReadOnlyAdapterRequest(request);

    expect(evaluation.status).toBe("ready");
    expect(evaluation.reasons).toHaveLength(0);
    expect(request.userReviewRequired).toBe(true);
  });
});

describe("GmailReadOnlyAdapterResult", () => {
  it("creates blocked result with invariant safety flags", () => {
    const result = createBlockedGmailReadOnlyAdapterResult({
      runtime: "nango",
      connectionVerified: false,
      reasons: ["connection_not_verified"],
    });

    expect(result.status).toBe("blocked");
    expect(result.safeForClient).toBe(true);
    expect(result.readOnly).toBe(true);
    expect(result.importedRawMessages).toBe(false);
    expect(result.retainedRawPayload).toBe(false);
    expect(result.retainedBodies).toBe(false);
    expect(result.retainedSnippets).toBe(false);
    expect(result.retainedAttachments).toBe(false);
    expect(result.hasToken).toBe(false);
    expect(isGmailReadOnlyAdapterResultSafe(result)).toBe(true);
  });

  it("creates ready/completed results with derived signals only", () => {
    const ready = createGmailReadOnlyAdapterResult({
      runtime: "sandbox",
      status: "ready",
      connectionVerified: true,
    });
    const completed = createGmailReadOnlyAdapterResult({
      runtime: "sandbox",
      status: "completed",
      connectionVerified: true,
      signals: [sampleSignal],
      processedMessageCount: 2,
    });

    expect(ready.status).toBe("ready");
    expect(completed.signals).toHaveLength(1);
    expect(completed.signals[0]?.reviewRequired).toBe(true);
    expect(completed.signals[0]?.confidence).toBeGreaterThanOrEqual(0);
    expect(completed.signals[0]?.confidence).toBeLessThanOrEqual(1);
    expect(isGmailReadOnlyAdapterResultSafe(completed)).toBe(true);
  });

  it("serialized result does not contain secrets or raw provider payload markers", () => {
    const result = createGmailReadOnlyAdapterResult({
      runtime: "nango",
      status: "completed",
      connectionVerified: true,
      signals: [sampleSignal],
    });
    const serialized = JSON.stringify(result);

    expect(serialized).not.toMatch(/access_token/i);
    expect(serialized).not.toMatch(/refresh_token/i);
    expect(serialized).not.toMatch(/client_secret/i);
    expect(serialized).not.toMatch(/"providerPayload"/i);
    expect(collectGmailReadOnlyAdapterWarnings(result)).toHaveLength(0);
  });

  it("rejects signals with forbidden fields or unsafe confidence", () => {
    const unsafeSignal = {
      ...sampleSignal,
      subject: "secret subject",
    } as GmailDerivedSignal & { subject: string };

    const result = createGmailReadOnlyAdapterResult({
      runtime: "nango",
      status: "completed",
      connectionVerified: true,
      signals: [unsafeSignal],
    });

    expect(isGmailReadOnlyAdapterResultSafe(result)).toBe(false);
    expect(collectGmailReadOnlyAdapterWarnings(result).join(" ")).toMatch(/forbidden field: subject/);

    const lowConfidence = { ...sampleSignal, confidence: 1.5 };
    const lowConfidenceResult = createGmailReadOnlyAdapterResult({
      runtime: "nango",
      status: "completed",
      connectionVerified: true,
      signals: [lowConfidence],
    });

    expect(isGmailReadOnlyAdapterResultSafe(lowConfidenceResult)).toBe(false);
  });
});

describe("gmail-readonly-adapter contract boundaries", () => {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const srcDir = join(moduleDir, "../src/gmail-readonly-adapter");

  it("does not import Nango SDK, googleapis, fetch, or process.env", () => {
    const files = ["types.ts", "safety.ts", "contract.ts", "index.ts"];
    const combined = files
      .map((file) => readFileSync(join(srcDir, file), "utf8"))
      .join("\n");

    expect(combined).not.toMatch(/from ['"]@nangohq/);
    expect(combined).not.toMatch(/from ['"]googleapis/);
    expect(combined).not.toMatch(/import\(['"]googleapis/);
    expect(combined).not.toMatch(/gmail\.users/);
    expect(combined).not.toMatch(/\bfetch\s*\(/);
    expect(combined).not.toMatch(/process\.env/);
  });
});
