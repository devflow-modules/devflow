import { describe, expect, it } from "vitest";
import {
  extractGmailSignals,
  sampleInterviewInviteEmail,
  sampleRecruiterEmail,
  sampleRejectionEmail,
  sampleTechnicalAssignmentEmail,
  shouldRetainRawProviderData,
} from "../src/index.js";

describe("extractGmailSignals", () => {
  it("maps recruiter email to screening", () => {
    const [signal] = extractGmailSignals([sampleRecruiterEmail]);
    expect(signal?.processStage).toBe("screening");
    expect(signal?.source).toBe("gmail");
    expect(signal?.actionRequired).toBe(true);
    expect(signal?.companyHint).toBe("Acme");
  });

  it("maps interview invite to interview with actionRequired", () => {
    const [signal] = extractGmailSignals([sampleInterviewInviteEmail]);
    expect(signal?.processStage).toBe("interview");
    expect(signal?.actionRequired).toBe(true);
  });

  it("maps rejection email to rejected", () => {
    const [signal] = extractGmailSignals([sampleRejectionEmail]);
    expect(signal?.processStage).toBe("rejected");
    expect(signal?.actionRequired).toBe(false);
  });

  it("maps technical assignment to technical with actionRequired", () => {
    const [signal] = extractGmailSignals([sampleTechnicalAssignmentEmail]);
    expect(signal?.processStage).toBe("technical");
    expect(signal?.actionRequired).toBe(true);
  });

  it("never retains raw provider data", () => {
    const signals = extractGmailSignals([
      sampleRecruiterEmail,
      sampleInterviewInviteEmail,
    ]);
    for (const signal of signals) {
      expect(signal.rawRetained).toBe(false);
    }
    expect(shouldRetainRawProviderData()).toBe(false);
  });

  it("is deterministic", () => {
    const first = extractGmailSignals([sampleRecruiterEmail]);
    const second = extractGmailSignals([sampleRecruiterEmail]);
    expect(first).toEqual(second);
  });
});
