import { createCareerBundle, type CareerLlmResult } from "@devflow/career-core";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CAREER_AI_DRAFT_DISCLAIMER,
  CAREER_AI_DRAFT_TITLE,
} from "./career-ai-draft-content";
import { CareerAiDraftView } from "./career-ai-draft";

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

const completedResult: CareerLlmResult = {
  status: "completed",
  provider: "mock",
  task: "generate_application_fit_explanation",
  agent: "application_analyst",
  output: {
    title: "Application fit explanation (draft)",
    summary: "Fit review completed for 1 application.",
    findings: [{ category: "fit", text: "Strong overlap on TypeScript.", priority: "high", evidenceIds: [] }],
    recommendations: [
      { category: "next_steps", text: "Prioritize the strongest match.", priority: "high", evidenceIds: [] },
    ],
    evidenceReferences: ["signal-1"],
    warnings: [],
  },
  warnings: [],
  reviewRequired: true,
  safeForClient: true,
  hasToken: false,
  persisted: false,
  executedExternally: false,
  externalProviderCalled: false,
  toolExecutionOccurred: false,
  trace: {
    requestId: "career-llm-local-1",
    steps: [
      { timestamp: "2026-06-17T10:00:00.000Z", status: "completed", code: "llm_request_received", message: "Received." },
      { timestamp: "2026-06-17T10:00:00.000Z", status: "simulated", code: "provider_called", message: "Simulated." },
      {
        timestamp: "2026-06-17T10:00:00.000Z",
        status: "completed",
        code: "human_review_required",
        message: "Review required.",
      },
    ],
  },
};

const blockedResult: CareerLlmResult = {
  ...completedResult,
  status: "blocked",
  output: null,
  warnings: [{ code: "llm_disabled", message: "Controlled LLM boundary is disabled." }],
  trace: { requestId: "blocked", steps: [] },
};

function render(overrides: Partial<Parameters<typeof CareerAiDraftView>[0]> = {}) {
  return renderToStaticMarkup(
    <CareerAiDraftView
      careerBundle={bundle}
      selectedSignalIds={[]}
      availableSignals={[]}
      action="analyze_application_fit"
      message="Focus on backend"
      explicitConsent={false}
      uiState="idle"
      result={null}
      errorMessage={null}
      showProposalsHint={false}
      onActionChange={() => undefined}
      onMessageChange={() => undefined}
      onConsentChange={() => undefined}
      onGenerate={() => undefined}
      onCopy={() => undefined}
      onReviewProposals={() => undefined}
      onCancel={() => undefined}
      isGenerating={false}
      {...overrides}
    />,
  );
}

describe("CareerAiDraftView", () => {
  it("renders idle state with disclaimer and manual review badge", () => {
    const html = render();
    expect(html).toContain(CAREER_AI_DRAFT_TITLE);
    expect(html).toContain(CAREER_AI_DRAFT_DISCLAIMER);
    expect(html).toContain("Manual review");
  });

  it("renders the consent checkbox and labeled controls for keyboard accessibility", () => {
    const html = render();
    expect(html).toMatch(/for="career-ai-draft-action-select"/);
    expect(html).toMatch(/for="career-ai-draft-message-input"/);
    expect(html).toMatch(/career-ai-draft-consent-checkbox/);
  });

  it("renders loading state", () => {
    const html = render({ uiState: "loading", explicitConsent: true, isGenerating: true });
    expect(html).toContain("Generating");
  });

  it("renders completed structured output, trace and review badge", () => {
    const html = render({ uiState: "completed", explicitConsent: true, result: completedResult });
    expect(html).toContain("Application fit explanation (draft)");
    expect(html).toContain("Strong overlap on TypeScript.");
    expect(html).toContain("Prioritize the strongest match.");
    expect(html).toContain("human_review_required");
    expect(html).toContain("Review required");
    expect(html).toContain("Copy draft");
    expect(html).toContain("Regenerate draft");
  });

  it("renders blocked disabled state", () => {
    const html = render({ uiState: "blocked", result: blockedResult });
    expect(html).toContain("llm_disabled");
  });

  it("renders error state", () => {
    const html = render({ uiState: "error", errorMessage: "Controlled LLM generation failed safely." });
    expect(html).toContain("Controlled LLM generation failed safely.");
  });

  it("never renders prohibited actions", () => {
    const html = render({ uiState: "completed", explicitConsent: true, result: completedResult });
    // The disclaimer legitimately names actions the model cannot perform; exclude it
    // before asserting that no prohibited action affordance is rendered.
    const withoutDisclaimer = html.replace(CAREER_AI_DRAFT_DISCLAIMER, "");
    expect(withoutDisclaimer).not.toMatch(
      /Run tools automatically|Apply recommendation|Submit application|Send message|Save automatically|Remember conversation|Always allow/i,
    );
  });

  it("shows the proposals hint without executing tools", () => {
    const html = render({
      uiState: "completed",
      explicitConsent: true,
      result: completedResult,
      showProposalsHint: true,
    });
    expect(html).toContain("never executes tools");
    expect(html).not.toMatch(/career-tools\/invoke/);
  });
});
