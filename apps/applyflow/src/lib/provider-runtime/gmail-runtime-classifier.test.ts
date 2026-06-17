import { describe, expect, it } from "vitest";
import { deriveGmailRuntimeSignalsFromMetadata } from "./gmail-runtime-classifier.js";

const REFERENCE = "2026-06-20T12:00:00.000Z";

function sampleMetadata(
  overrides?: Partial<Parameters<typeof deriveGmailRuntimeSignalsFromMetadata>[0][number]>,
) {
  return {
    occurredAt: "2026-06-18T10:00:00.000Z",
    direction: "inbound" as const,
    senderDomain: "company.example",
    recipientDomains: ["candidate.example"],
    hasAttachment: false,
    labels: ["INBOX", "UNREAD"],
    ...overrides,
  };
}

describe("deriveGmailRuntimeSignalsFromMetadata", () => {
  it("returns zero signals for empty metadata", () => {
    expect(deriveGmailRuntimeSignalsFromMetadata([])).toEqual([]);
  });

  it("returns one factual signal for one valid metadata item", () => {
    const signals = deriveGmailRuntimeSignalsFromMetadata([sampleMetadata()]);

    expect(signals).toHaveLength(1);
    expect(signals[0]?.kind).toBe("provider_email_activity");
    expect(signals[0]?.confidenceLevel).toBe("high");
    expect(signals[0]?.company).toBe("company.example");
    expect(signals[0]?.reason).toContain("Rule A");
  });

  it("returns deterministically ordered signals for multiple metadata items", () => {
    const signals = deriveGmailRuntimeSignalsFromMetadata([
      sampleMetadata({ occurredAt: "2026-06-19T10:00:00.000Z", senderDomain: "b.example" }),
      sampleMetadata({ occurredAt: "2026-06-18T10:00:00.000Z", senderDomain: "a.example" }),
    ]);

    expect(signals.map((signal) => signal.occurredAt)).toEqual([
      "2026-06-18T10:00:00.000Z",
      "2026-06-19T10:00:00.000Z",
    ]);
  });

  it("does not include full email addresses in output", () => {
    const signals = deriveGmailRuntimeSignalsFromMetadata([sampleMetadata()]);
    const serialized = JSON.stringify(signals).toLowerCase();

    expect(serialized).not.toContain("candidate@");
    expect(serialized).not.toContain("@company.example");
  });

  it("does not include subject, snippet, or body as signal fields", () => {
    const signals = deriveGmailRuntimeSignalsFromMetadata([sampleMetadata()]);

    for (const signal of signals) {
      expect(Object.keys(signal)).not.toContain("subject");
      expect(Object.keys(signal)).not.toContain("snippet");
      expect(Object.keys(signal)).not.toContain("body");
    }
  });

  it("mentions only authorized labels in reason and omits unauthorized labels", () => {
    const signals = deriveGmailRuntimeSignalsFromMetadata([
      sampleMetadata({ labels: ["INBOX", "career.application", "company.acme"] }),
    ]);

    expect(signals[0]?.reason).toContain("INBOX");
    expect(signals[0]?.reason).not.toContain("career.application");
    expect(signals[0]?.reason).not.toContain("company.acme");
  });

  it("skips invalid metadata without occurredAt", () => {
    const signals = deriveGmailRuntimeSignalsFromMetadata([
      sampleMetadata({ occurredAt: "not-a-date" }),
    ]);

    expect(signals).toEqual([]);
  });

  it("does not emit follow-up signals from this classifier", () => {
    const signals = deriveGmailRuntimeSignalsFromMetadata([
      sampleMetadata({ direction: "unknown", occurredAt: REFERENCE }),
    ]);

    expect(signals.every((signal) => signal.kind === "provider_email_activity")).toBe(true);
  });
});
