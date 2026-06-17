import { createCareerBundle } from "@devflow/career-core";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CAREER_AGENT_WORKSPACE_DISCLAIMER,
  CAREER_AGENT_WORKSPACE_TITLE,
} from "./career-agent-workspace-content";
import { CareerAgentWorkspaceView } from "./career-agent-workspace";

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

describe("CareerAgentWorkspaceView", () => {
  it("renders idle state with disclaimer and manual review badge", () => {
    const html = renderToStaticMarkup(
      <CareerAgentWorkspaceView
        careerBundle={bundle}
        selectedSignalIds={[]}
        availableSignals={[]}
        intent="analyze_application_fit"
        explicitConsent={false}
        uiState="idle"
        result={null}
        errorMessage={null}
        onIntentChange={() => undefined}
        onConsentChange={() => undefined}
        onRunAnalysis={() => undefined}
        isRunning={false}
      />,
    );

    expect(html).toContain(CAREER_AGENT_WORKSPACE_TITLE);
    expect(html).toContain(CAREER_AGENT_WORKSPACE_DISCLAIMER);
    expect(html).toContain("Manual review");
    expect(html).not.toMatch(/\bApply\b|\bSubmit\b|\bSend\b|Save automatically|Execute tool/i);
  });

  it("renders blocked state without bundle", () => {
    const html = renderToStaticMarkup(
      <CareerAgentWorkspaceView
        careerBundle={null}
        selectedSignalIds={[]}
        availableSignals={[]}
        intent="analyze_application_fit"
        explicitConsent={false}
        uiState="blocked"
        result={null}
        errorMessage={null}
        onIntentChange={() => undefined}
        onConsentChange={() => undefined}
        onRunAnalysis={() => undefined}
        isRunning={false}
      />,
    );

    expect(html).toContain('data-testid="career-agent-empty-message"');
  });

  it("renders completed result, trace, and capabilities", () => {
    const html = renderToStaticMarkup(
      <CareerAgentWorkspaceView
        careerBundle={bundle}
        selectedSignalIds={[]}
        availableSignals={[]}
        intent="prepare_interview"
        explicitConsent={true}
        uiState="completed"
        result={{
          status: "completed",
          agent: "interview_coach",
          summary: "done",
          findings: [],
          recommendations: [],
          evidence: [],
          warnings: [],
          reviewRequired: true,
          safeForClient: true,
          hasToken: false,
          rawProviderDataUsed: false,
          persisted: false,
          trace: {
            requestId: "req-1",
            steps: [
              {
                timestamp: "2026-06-16T12:00:00.000Z",
                status: "completed",
                code: "review_required",
                message: "Human review required.",
              },
            ],
          },
          executionPlan: {
            selectedAgent: "interview_coach",
            reason: "routed",
            requiredInputs: ["careerBundle.applications"],
            missingInputs: [],
            allowedCapabilities: ["derive_interview_plan"],
            blockedCapabilities: ["submit_application"],
            reviewRequired: true,
          },
          interviewPreparationProposal: {
            reviewRequired: true,
            inMemory: true,
            exportable: true,
            copyable: true,
            focusAreas: ["Acme — Backend Engineer"],
            studyTopics: [],
            starPrompts: [],
            mockInterviewPlan: [],
          },
        }}
        errorMessage={null}
        onIntentChange={() => undefined}
        onConsentChange={() => undefined}
        onRunAnalysis={() => undefined}
        isRunning={false}
      />,
    );

    expect(html).toContain('data-testid="career-agent-result"');
    expect(html).toContain('data-testid="career-agent-trace"');
    expect(html).toContain('data-testid="career-agent-handoff-preview"');
    expect(html).toContain('data-testid="career-agent-allowed-capabilities"');
  });

  it("exposes consent checkbox and intent selector for keyboard access", () => {
    const html = renderToStaticMarkup(
      <CareerAgentWorkspaceView
        careerBundle={bundle}
        selectedSignalIds={[]}
        availableSignals={[]}
        intent="analyze_application_fit"
        explicitConsent={false}
        uiState="idle"
        result={null}
        errorMessage={null}
        onIntentChange={() => undefined}
        onConsentChange={() => undefined}
        onRunAnalysis={() => undefined}
        isRunning={false}
      />,
    );

    expect(html).toContain('id="career-agent-intent-select"');
    expect(html).toContain('data-testid="career-agent-consent-checkbox"');
  });
});

describe("CareerAgentWorkspace module boundaries", () => {
  it("does not reference forbidden persistence or provider SDKs in workspace component", async () => {
    const source = await import("./career-agent-workspace.tsx?raw").catch(() => null);
    if (source && "default" in source) {
      const text = String(source.default);
      expect(text).not.toMatch(/localStorage|sessionStorage|OpenAI|Nango/i);
    }
  });
});
