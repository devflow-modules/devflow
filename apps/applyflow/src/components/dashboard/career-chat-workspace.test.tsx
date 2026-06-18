import { createCareerBundle } from "@devflow/career-core";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CAREER_CHAT_WORKSPACE_DISCLAIMER,
  CAREER_CHAT_WORKSPACE_TITLE,
} from "./career-chat-workspace-content";
import { CareerChatWorkspaceView } from "./career-chat-workspace";

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
