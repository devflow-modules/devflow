import { createCareerBundle, type CareerAutomationExecutionResult } from "@devflow/career-core";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  APPROVED_AUTOMATION_REVIEW_DISCLAIMER,
  APPROVED_AUTOMATION_REVIEW_TITLE,
} from "./approved-automation-review-content";
import { ApprovedAutomationReviewView } from "./approved-automation-review";

const bundle = createCareerBundle([
  {
    id: "app-1",
    company: "Acme",
    role: "Backend Engineer",
    source: "linkedin",
    requiredSkills: ["TypeScript"],
    status: "applied",
  },
]);

const preview = {
  title: "Prepare application fit review",
  description: "Derive a structured application fit summary for human review. No application is changed.",
  tool: "career.derive_fit_summary",
  requiredCapability: "derive_fit_summary",
  riskLevel: "derive",
  requiresExplicitApproval: false,
  inputPreview: { applicationId: "app-1" },
};

const completedResult: CareerAutomationExecutionResult = {
  status: "completed",
  provider: "mock",
  proposalId: "career-automation::prepare_application_review::x",
  kind: "prepare_application_review",
  toolName: "career.derive_fit_summary",
  data: { applicationId: "app-1", summary: "Fit review prepared." },
  warnings: [],
  reviewRequired: true,
  safeForClient: true,
  hasToken: false,
  persisted: false,
  executedExternally: false,
  backgroundExecution: false,
  scheduled: false,
  trace: {
    requestId: "career-agent::analyze_application_fit::x",
    proposalId: "career-automation::prepare_application_review::x",
    steps: [
      {
        timestamp: "2026-06-17T10:00:00.000Z",
        status: "completed",
        code: "automation_request_received",
        message: "Received.",
      },
      {
        timestamp: "2026-06-17T10:00:00.000Z",
        status: "completed",
        code: "human_review_required",
        message: "Review required.",
      },
    ],
  },
};

const blockedResult: CareerAutomationExecutionResult = {
  ...completedResult,
  status: "blocked",
  data: {},
  warnings: [{ code: "automation_disabled", message: "Approved automation boundary is disabled." }],
  trace: { requestId: "blocked", proposalId: "blocked", steps: [] },
};

function render(overrides: Partial<Parameters<typeof ApprovedAutomationReviewView>[0]> = {}) {
  return renderToStaticMarkup(
    <ApprovedAutomationReviewView
      careerBundle={bundle}
      selectedSignalIds={[]}
      availableSignals={[]}
      kind="prepare_application_review"
      preview={preview}
      approvedOnce={false}
      isRunning={false}
      uiState="idle"
      result={null}
      errorMessage={null}
      showOutput={false}
      onKindChange={() => undefined}
      onApproveOnce={() => undefined}
      onRun={() => undefined}
      onCancel={() => undefined}
      onCopy={() => undefined}
      onReviewOutput={() => undefined}
      {...overrides}
    />,
  );
}

describe("ApprovedAutomationReviewView", () => {
  it("renders idle state with disclaimer, proposal and manual review badge", () => {
    const html = render();
    expect(html).toContain(APPROVED_AUTOMATION_REVIEW_TITLE);
    expect(html).toContain(APPROVED_AUTOMATION_REVIEW_DISCLAIMER);
    expect(html).toContain("Manual review");
    expect(html).toContain("career.derive_fit_summary");
    expect(html).toContain("Approve once");
  });

  it("exposes labeled controls for keyboard accessibility", () => {
    const html = render();
    expect(html).toMatch(/for="approved-automation-kind-select"/);
    expect(html).toMatch(/approved-automation-approve-once-button/);
    expect(html).toMatch(/approved-automation-run-button/);
    expect(html).toMatch(/approved-automation-cancel-button/);
  });

  it("renders approval-required state", () => {
    const html = render({ approvedOnce: true, uiState: "approval_required" });
    expect(html).toContain("Explicit approval is required");
  });

  it("renders running state", () => {
    const html = render({ approvedOnce: true, isRunning: true, uiState: "running" });
    expect(html).toContain("Running");
  });

  it("renders completed result, trace, output and review badge", () => {
    const html = render({ uiState: "completed", result: completedResult, showOutput: true });
    expect(html).toContain("human_review_required");
    expect(html).toContain("Review required");
    expect(html).toContain("Copy result");
    expect(html).toContain("Review output");
    expect(html).toContain("Fit review prepared.");
    expect(html).toContain("Scheduled: false");
    expect(html).toContain("Background: false");
    expect(html).toContain("Persisted: false");
  });

  it("renders blocked disabled state", () => {
    const html = render({ uiState: "blocked", result: blockedResult });
    expect(html).toContain("automation_disabled");
  });

  it("renders cancelled state", () => {
    const html = render({ uiState: "cancelled" });
    expect(html).toContain("Approval cleared");
  });

  it("renders error state", () => {
    const html = render({ errorMessage: "Approved automation failed safely." });
    expect(html).toContain("Approved automation failed safely.");
  });

  it("never renders prohibited actions", () => {
    const html = render({ uiState: "completed", result: completedResult });
    const withoutDisclaimer = html.replace(APPROVED_AUTOMATION_REVIEW_DISCLAIMER, "");
    // Status flags like "Scheduled: false" are legitimate negative assertions, so the
    // prohibited-action matchers use word boundaries to only catch action affordances.
    expect(withoutDisclaimer).not.toMatch(
      /Always allow|Run automatically|\bSchedule\b|\bRepeat\b|Background mode|Remember approval|Execute all|Apply now|\bSend\b|\bSubmit\b/i,
    );
  });

  it("keeps the client off the tool endpoint", () => {
    const html = render({ uiState: "completed", result: completedResult });
    expect(html).not.toMatch(/career-tools\/invoke/);
  });
});
