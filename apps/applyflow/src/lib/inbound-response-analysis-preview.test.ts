import { describe, expect, it, vi } from "vitest";

import {
  ORIGINAL_GMAIL_SCAN_BATCH_AVAILABLE,
  ORIGINAL_GMAIL_SCAN_BATCH_LIMITATION,
  SYNTHETIC_INBOUND_PREVIEW_EMAILS,
  runSyntheticInboundResponseAnalysisPreview,
} from "./inbound-response-analysis-preview";

vi.mock("./local-inbound-response-storage", () => ({
  persistDashboardInboundResponses: () => {
    throw new Error("preview must not persist detections");
  },
  loadDashboardInboundResponses: () => {
    throw new Error("preview must not read stored detections");
  },
}));

describe("runSyntheticInboundResponseAnalysisPreview", () => {
  it("classifies synthetic fixtures without persistence or Gmail access", () => {
    const preview = runSyntheticInboundResponseAnalysisPreview();
    expect(ORIGINAL_GMAIL_SCAN_BATCH_AVAILABLE).toBe(false);
    expect(ORIGINAL_GMAIL_SCAN_BATCH_LIMITATION).toContain("not retained");
    expect(preview.source).toBe("synthetic");
    expect(preview.persisted).toBe(false);
    expect(preview.summary.analyzedCount).toBe(SYNTHETIC_INBOUND_PREVIEW_EMAILS.length);
    expect(preview.summary.detectionsCreated).toBe(2);
    expect(preview.summary.detectionsReused).toBe(0);
    expect(preview.summary.discardedCount).toBe(2);
    expect(preview.decisions).toEqual([
      {
        emailId: "syn-company-interview",
        outcome: "created",
        matchStatus: "matched",
        classification: "interview",
      },
      {
        emailId: "syn-ashby-shared-host",
        outcome: "discarded",
        reason: "irrelevant_unmatched",
      },
      {
        emailId: "syn-ashby-tempo-ack",
        outcome: "created",
        matchStatus: "matched",
        classification: "application_acknowledged",
      },
      {
        emailId: "syn-job-alert",
        outcome: "discarded",
        reason: "job_alert",
      },
    ]);
  });

  it("treats an already stored synthetic detection as reused, not as a new match", () => {
    const first = runSyntheticInboundResponseAnalysisPreview();
    const existing = [
      {
        id: "detect-syn-company-interview",
        emailId: "syn-company-interview",
        applicationId: "app-bluelight",
        companyName: "Bluelight Consulting",
        headline: "Bluelight Consulting respondeu → possível entrevista",
        matchStatus: "matched" as const,
        matchConfidence: "high" as const,
        matchEvidence: ["domínio próprio da empresa"],
        classification: "interview" as const,
        classificationConfidence: "high" as const,
        classificationEvidence: ["texto contém convite ou menção explícita a entrevista"],
        suggestedStatus: "screening" as const,
        fromStatus: "applied" as const,
        pipelineChange: true,
        state: "pending_review" as const,
        detectedAt: "2026-09-15T17:00:00.000Z",
        receivedAt: "2026-09-15T18:00:00.000Z",
        senderDomain: "bluelightconsulting.com",
        autoApply: false as const,
        reviewRequired: true as const,
      },
    ];
    const preview = runSyntheticInboundResponseAnalysisPreview({ existing });
    expect(first.summary.detectionsCreated).toBe(2);
    expect(preview.summary.analyzedCount).toBe(4);
    expect(preview.summary.detectionsCreated).toBe(1);
    expect(preview.summary.detectionsReused).toBe(1);
    expect(preview.summary.discardedCount).toBe(2);
    expect(preview.decisions.find((item) => item.emailId === "syn-company-interview")?.outcome).toBe("reused");
    expect(preview.decisions.find((item) => item.emailId === "syn-ashby-tempo-ack")?.outcome).toBe("created");
    expect(preview.decisions.find((item) => item.emailId === "syn-ashby-shared-host")?.outcome).toBe("discarded");
  });
});
