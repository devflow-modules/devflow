import { createCareerBundle } from "@devflow/career-core";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CAREER_CHAT_WORKSPACE_PILOT_BADGE,
  CAREER_CHAT_WORKSPACE_PILOT_NOTICE,
} from "./career-chat-workspace-content";
import { CareerChatWorkspaceView, EMPTY_SPECIALIST_FIELDS } from "./career-chat-workspace";

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

const baseProps = {
  careerBundle: bundle,
  selectedSignalIds: [],
  availableSignals: [],
  action: "analyze_resume" as const,
  message: "Improve clarity",
  explicitConsent: true,
  uiState: "completed" as const,
  errorMessage: null,
  selectedProposal: null,
  approvedOnce: false,
  onActionChange: () => undefined,
  onMessageChange: () => undefined,
  onConsentChange: () => undefined,
  onSend: () => undefined,
  onReviewProposal: () => undefined,
  onApproveOnce: () => undefined,
  onCancelReview: () => undefined,
  onCopyResponse: () => undefined,
  isSending: false,
  specialistFields: EMPTY_SPECIALIST_FIELDS,
  onSpecialistFieldChange: () => undefined,
};

describe("CareerChatWorkspaceView pilot mode", () => {
  it("hides the pilot badge and notice when pilot mode is off", () => {
    const html = renderToStaticMarkup(
      <CareerChatWorkspaceView {...baseProps} response={null} pilotMode={false} />,
    );
    expect(html).not.toContain(CAREER_CHAT_WORKSPACE_PILOT_BADGE);
    expect(html).not.toContain("career-chat-pilot-notice");
  });

  it("shows the pilot badge, review notice, and feedback controls when completed in pilot mode", () => {
    const html = renderToStaticMarkup(
      <CareerChatWorkspaceView
        {...baseProps}
        pilotMode
        response={{
          status: "completed",
          intent: "analyze_resume",
          reviewRequired: true,
          safeForClient: true,
          hasToken: false,
          persisted: false,
          executedExternally: false,
          warnings: [],
          toolProposals: [],
          trace: { steps: [] },
        } as never}
      />,
    );
    expect(html).toContain(CAREER_CHAT_WORKSPACE_PILOT_BADGE);
    expect(html).toContain(CAREER_CHAT_WORKSPACE_PILOT_NOTICE);
    expect(html).toContain("career-chat-feedback-helpful");
  });
});
