import { createCareerBundle } from "@devflow/career-core";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CAREER_CHAT_WORKSPACE_DISCLAIMER,
  CAREER_CHAT_WORKSPACE_TITLE,
} from "./career-chat-workspace-content";
import {
  CareerChatWorkspaceView,
  buildSpecialistAnalysisInput,
  EMPTY_SPECIALIST_FIELDS,
} from "./career-chat-workspace";

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

describe("CareerChatWorkspaceView", () => {
  it("renders idle state with disclaimer and review badge when response requires review", () => {
    const html = renderToStaticMarkup(
      <CareerChatWorkspaceView
        careerBundle={bundle}
        selectedSignalIds={[]}
        availableSignals={[]}
        action="prepare_interview"
        message="Focus on React architecture"
        explicitConsent={false}
        uiState="idle"
        response={null}
        errorMessage={null}
        selectedProposal={null}
        approvedOnce={false}
        onActionChange={() => undefined}
        onMessageChange={() => undefined}
        onConsentChange={() => undefined}
        onSend={() => undefined}
        onReviewProposal={() => undefined}
        onApproveOnce={() => undefined}
        onCancelReview={() => undefined}
        onCopyResponse={() => undefined}
        isSending={false}
      />,
    );

    expect(html).toContain(CAREER_CHAT_WORKSPACE_TITLE);
    expect(html).toContain(CAREER_CHAT_WORKSPACE_DISCLAIMER);
    expect(html).toContain("Manual review");
    expect(html).not.toMatch(
      /Auto run tools|Always allow|Execute all|Send automatically|Apply now|Remember approval|Background agent/i,
    );
  });

  it("renders validating state", () => {
    const html = renderToStaticMarkup(
      <CareerChatWorkspaceView
        careerBundle={bundle}
        selectedSignalIds={[]}
        availableSignals={[]}
        action="analyze_application_fit"
        message="How well do I fit?"
        explicitConsent={true}
        uiState="validating"
        response={null}
        errorMessage={null}
        selectedProposal={null}
        approvedOnce={false}
        onActionChange={() => undefined}
        onMessageChange={() => undefined}
        onConsentChange={() => undefined}
        onSend={() => undefined}
        onReviewProposal={() => undefined}
        onApproveOnce={() => undefined}
        onCancelReview={() => undefined}
        onCopyResponse={() => undefined}
        isSending={true}
      />,
    );

    expect(html).toContain('data-testid="career-chat-status-message"');
    expect(html).toContain("Validating chat request");
  });

  it("renders blocked adapter disabled state", () => {
    const html = renderToStaticMarkup(
      <CareerChatWorkspaceView
        careerBundle={bundle}
        selectedSignalIds={[]}
        availableSignals={[]}
        action="prepare_interview"
        message="Focus"
        explicitConsent={true}
        uiState="blocked"
        response={{
          status: "blocked",
          provider: "librechat",
          conversationId: "blocked",
          intent: "unknown",
          agentResult: null,
          toolProposals: [],
          warnings: [{ code: "librechat_adapter_disabled", message: "disabled" }],
          reviewRequired: true,
          safeForClient: true,
          hasToken: false,
          persisted: false,
          executedExternally: false,
          trace: { conversationId: "blocked", steps: [] },
        }}
        errorMessage={null}
        selectedProposal={null}
        approvedOnce={false}
        onActionChange={() => undefined}
        onMessageChange={() => undefined}
        onConsentChange={() => undefined}
        onSend={() => undefined}
        onReviewProposal={() => undefined}
        onApproveOnce={() => undefined}
        onCancelReview={() => undefined}
        onCopyResponse={() => undefined}
        isSending={false}
      />,
    );

    expect(html).toContain("LIBRECHAT_ADAPTER_ENABLED");
  });

  it("renders completed response with tool proposals, trace, and character counter", () => {
    const html = renderToStaticMarkup(
      <CareerChatWorkspaceView
        careerBundle={bundle}
        selectedSignalIds={[]}
        availableSignals={[]}
        action="prepare_interview"
        message="Focus on frontend architecture"
        explicitConsent={true}
        uiState="completed"
        response={{
          status: "completed",
          provider: "librechat",
          conversationId: "conv-1",
          intent: "prepare_interview",
          agentResult: {
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
            trace: { requestId: "req-1", steps: [] },
            executionPlan: {
              selectedAgent: "interview_coach",
              reason: "routed",
              requiredInputs: [],
              missingInputs: [],
              allowedCapabilities: ["derive_interview_plan"],
              blockedCapabilities: [],
              reviewRequired: true,
            },
          },
          toolProposals: [
            {
              toolName: "career.derive_interview_plan",
              description: "Derive structured interview preparation plan from sanitized context.",
              requiredCapability: "derive_interview_plan",
              riskLevel: "derive",
              requiresExplicitApproval: false,
              inputPreview: { applicationId: "app-1" },
              status: "ready_for_review",
            },
          ],
          warnings: [],
          reviewRequired: true,
          safeForClient: true,
          hasToken: false,
          persisted: false,
          executedExternally: false,
          trace: {
            conversationId: "conv-1",
            steps: [
              {
                timestamp: "2026-06-16T12:00:00.000Z",
                status: "completed",
                code: "human_review_required",
                message: "Human review is required before any tool execution.",
              },
            ],
          },
        }}
        errorMessage={null}
        selectedProposal={null}
        approvedOnce={false}
        onActionChange={() => undefined}
        onMessageChange={() => undefined}
        onConsentChange={() => undefined}
        onSend={() => undefined}
        onReviewProposal={() => undefined}
        onApproveOnce={() => undefined}
        onCancelReview={() => undefined}
        onCopyResponse={() => undefined}
        isSending={false}
      />,
    );

    expect(html).toContain('data-testid="career-chat-review-badge"');
    expect(html).toContain('data-testid="career-chat-agent-result"');
    expect(html).toContain('data-testid="career-chat-tool-proposals"');
    expect(html).toContain('data-testid="career-chat-trace"');
    expect(html).toContain('data-testid="career-chat-character-counter"');
    expect(html).toContain("30/4000");
  });

  it("exposes consent checkbox and action selector for keyboard access", () => {
    const html = renderToStaticMarkup(
      <CareerChatWorkspaceView
        careerBundle={bundle}
        selectedSignalIds={[]}
        availableSignals={[]}
        action="analyze_application_fit"
        message=""
        explicitConsent={false}
        uiState="idle"
        response={null}
        errorMessage={null}
        selectedProposal={null}
        approvedOnce={false}
        onActionChange={() => undefined}
        onMessageChange={() => undefined}
        onConsentChange={() => undefined}
        onSend={() => undefined}
        onReviewProposal={() => undefined}
        onApproveOnce={() => undefined}
        onCancelReview={() => undefined}
        onCopyResponse={() => undefined}
        isSending={false}
      />,
    );

    expect(html).toContain('id="career-chat-action-select"');
    expect(html).toContain('data-testid="career-chat-consent-checkbox"');
    expect(html).toContain('id="career-chat-message-input"');
  });

  it("renders consent required blocked state without bundle", () => {
    const html = renderToStaticMarkup(
      <CareerChatWorkspaceView
        careerBundle={null}
        selectedSignalIds={[]}
        availableSignals={[]}
        action="analyze_application_fit"
        message=""
        explicitConsent={false}
        uiState="blocked"
        response={null}
        errorMessage={null}
        selectedProposal={null}
        approvedOnce={false}
        onActionChange={() => undefined}
        onMessageChange={() => undefined}
        onConsentChange={() => undefined}
        onSend={() => undefined}
        onReviewProposal={() => undefined}
        onApproveOnce={() => undefined}
        onCancelReview={() => undefined}
        onCopyResponse={() => undefined}
        isSending={false}
      />,
    );

    expect(html).toContain('data-testid="career-chat-status-message"');
  });
});

describe("CareerChatWorkspaceView specialist intents", () => {
  it("renders specialist inputs for analyze_resume", () => {
    const html = renderToStaticMarkup(
      <CareerChatWorkspaceView
        careerBundle={bundle}
        selectedSignalIds={[]}
        availableSignals={[]}
        action="analyze_resume"
        message="Improve clarity"
        explicitConsent={true}
        uiState="idle"
        response={null}
        errorMessage={null}
        selectedProposal={null}
        approvedOnce={false}
        onActionChange={() => undefined}
        onMessageChange={() => undefined}
        onConsentChange={() => undefined}
        onSend={() => undefined}
        onReviewProposal={() => undefined}
        onApproveOnce={() => undefined}
        onCancelReview={() => undefined}
        onCopyResponse={() => undefined}
        isSending={false}
      />,
    );

    expect(html).toContain('data-testid="career-chat-specialist-inputs"');
    expect(html).toContain('data-testid="career-chat-resume-bullets"');
    expect(html).toContain("Analisar currículo");
  });

  it("renders specialized resume analysis result and review proposal", () => {
    const html = renderToStaticMarkup(
      <CareerChatWorkspaceView
        careerBundle={bundle}
        selectedSignalIds={[]}
        availableSignals={[]}
        action="analyze_resume"
        message="Improve clarity"
        explicitConsent={true}
        uiState="completed"
        response={{
          status: "completed",
          provider: "librechat",
          conversationId: "conv-1",
          intent: "analyze_resume",
          agentResult: {
            status: "completed",
            agent: "resume_analyst",
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
            trace: { requestId: "req-1", steps: [] },
            resumeAnalysis: {
              score: 72,
              strengths: ["Has summary"],
              weaknesses: ["Sparse skills"],
              missingEvidence: [],
              bulletRecommendations: [],
              sectionRecommendations: ["Reorder experience"],
              risks: ["Keep claims factual"],
              nextActions: [],
              reviewRequired: true,
            },
            reviewProposal: {
              proposalTool: "career.prepare_resume_review",
              exportTool: "career.export_review_payload",
              title: "Resume review proposal",
              summary: "done",
              sanitizedArguments: {},
              reviewRequired: true,
              executed: false,
            },
          },
          toolProposals: [],
          warnings: [],
          reviewRequired: true,
          safeForClient: true,
          hasToken: false,
          persisted: false,
          executedExternally: false,
          trace: { conversationId: "conv-1", steps: [] },
        }}
        errorMessage={null}
        selectedProposal={null}
        approvedOnce={false}
        onActionChange={() => undefined}
        onMessageChange={() => undefined}
        onConsentChange={() => undefined}
        onSend={() => undefined}
        onReviewProposal={() => undefined}
        onApproveOnce={() => undefined}
        onCancelReview={() => undefined}
        onCopyResponse={() => undefined}
        isSending={false}
      />,
    );

    expect(html).toContain('data-testid="career-chat-resume-analysis"');
    expect(html).toContain("Score: 72/100");
    expect(html).toContain('data-testid="career-chat-review-proposal"');
    expect(html).toContain("career.prepare_resume_review");
  });
});

describe("buildSpecialistAnalysisInput", () => {
  it("returns undefined for non-specialist intents", () => {
    expect(
      buildSpecialistAnalysisInput({
        action: "prepare_interview",
        fields: EMPTY_SPECIALIST_FIELDS,
        mainStack: ["TypeScript"],
        fallbackRole: "Backend Engineer",
      }),
    ).toBeUndefined();
  });

  it("builds a resume snapshot for analyze_resume", () => {
    const input = buildSpecialistAnalysisInput({
      action: "analyze_resume",
      fields: { ...EMPTY_SPECIALIST_FIELDS, resumeBullets: "Built APIs\nLed migration" },
      mainStack: ["TypeScript", "Node.js"],
      fallbackRole: "Backend Engineer",
    });
    expect(input?.resumeSnapshot?.experiences[0]?.bullets).toEqual(["Built APIs", "Led migration"]);
    expect(input?.resumeSnapshot?.skills).toEqual(["TypeScript", "Node.js"]);
    expect(input?.targetRole).toBe("Backend Engineer");
  });

  it("builds a job snapshot for analyze_ats_compatibility", () => {
    const input = buildSpecialistAnalysisInput({
      action: "analyze_ats_compatibility",
      fields: { ...EMPTY_SPECIALIST_FIELDS, jobRequirements: "TypeScript experience\nKubernetes" },
      mainStack: ["TypeScript"],
      fallbackRole: "Backend Engineer",
    });
    expect(input?.jobSnapshot?.requiredRequirements).toEqual([
      "TypeScript experience",
      "Kubernetes",
    ]);
  });

  it("extracts Unicode keywords for Portuguese job requirements", () => {
    const input = buildSpecialistAnalysisInput({
      action: "analyze_ats_compatibility",
      fields: {
        ...EMPTY_SPECIALIST_FIELDS,
        jobRequirements: "Experiência com backend\nInglês intermediário\nConhecimento em cloud",
      },
      mainStack: ["TypeScript"],
      fallbackRole: "Backend Engineer",
    });
    expect(input?.jobSnapshot?.keywords).toContain("experiência");
    expect(input?.jobSnapshot?.keywords).toContain("inglês");
    expect(input?.jobSnapshot?.keywords).toContain("intermediário");
    expect(input?.jobSnapshot?.keywords).toContain("conhecimento");
  });

  it("builds target roles for plan_career_strategy", () => {
    const input = buildSpecialistAnalysisInput({
      action: "plan_career_strategy",
      fields: { ...EMPTY_SPECIALIST_FIELDS, targetRoles: "Backend, SRE", availability: "10h/week" },
      mainStack: [],
      fallbackRole: "",
    });
    expect(input?.targetRoles).toEqual(["Backend", "SRE"]);
    expect(input?.availability).toBe("10h/week");
  });
});

describe("CareerChatWorkspace module boundaries", () => {
  it("does not reference forbidden persistence or provider SDKs in workspace component", async () => {
    const workspaceSource = await import("./career-chat-workspace.tsx?raw").catch(() => null);
    const clientSource = await import("./career-chat-workspace-client.ts?raw").catch(() => null);

    if (workspaceSource && "default" in workspaceSource) {
      const text = String(workspaceSource.default);
      expect(text).not.toMatch(/localStorage|sessionStorage|IndexedDB|OpenAI|Anthropic|LibreChat SDK|Nango/i);
    }

    if (clientSource && "default" in clientSource) {
      const text = String(clientSource.default);
      expect(text).toMatch(/\/career-chat\/librechat/);
      expect(text).not.toMatch(/WebSocket|EventSource|ReadableStream|\/career-tools\/invoke/);
    }
  });
});
