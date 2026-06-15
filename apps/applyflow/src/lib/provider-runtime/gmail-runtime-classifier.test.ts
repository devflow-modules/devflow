import { describe, expect, it } from "vitest";
import { deriveGmailRuntimeSignalsFromMetadata } from "./gmail-runtime-classifier.js";

describe("deriveGmailRuntimeSignalsFromMetadata", () => {
  it("returns no signals for real metadata in the conservative first runtime", () => {
    const signals = deriveGmailRuntimeSignalsFromMetadata([
      {
        occurredAt: "2026-06-20T14:00:00.000Z",
        direction: "inbound",
        senderDomain: "jobs.example",
        recipientDomains: ["candidate.example"],
        hasAttachment: false,
        labels: ["INBOX"],
      },
    ]);

    expect(signals).toEqual([]);
  });
});
