// @vitest-environment jsdom
import { createCareerBundle } from "@devflow/career-core";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CAREER_PILOT_ERROR_DESCRIPTION,
  CAREER_PILOT_ERROR_TITLE,
} from "./career-pilot-content";
import {
  CareerChatWorkspace,
  CareerChatWorkspaceView,
  EMPTY_SPECIALIST_FIELDS,
} from "./career-chat-workspace";
import * as careerChatClient from "./career-chat-workspace-client";

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

const completedResponse = {
  status: "completed" as const,
  provider: "librechat" as const,
  conversationId: "conv-1",
  intent: "analyze_resume" as const,
  agentResult: {
    status: "completed" as const,
    agent: "resume_analyst" as const,
    summary: "Resume reviewed",
    findings: [],
    recommendations: [],
    evidence: [],
    warnings: [],
    reviewRequired: true as const,
    safeForClient: true as const,
    hasToken: false as const,
    rawProviderDataUsed: false as const,
    persisted: false as const,
    trace: { requestId: "req-1", steps: [] },
    resumeAnalysis: {
      score: 72,
      strengths: ["Clear structure"],
      weaknesses: ["Add metrics"],
      missingEvidence: [],
      bulletRecommendations: [],
      sectionRecommendations: ["Highlight impact"],
      risks: [],
      nextActions: ["Quantify achievements"],
      reviewRequired: true as const,
    },
  },
  toolProposals: [],
  warnings: [],
  reviewRequired: true as const,
  safeForClient: true as const,
  hasToken: false as const,
  persisted: false as const,
  executedExternally: false as const,
  trace: { conversationId: "conv-1", steps: [] },
};

const baseViewProps = {
  careerBundle: bundle,
  selectedSignalIds: [] as string[],
  availableSignals: [],
  action: "analyze_resume" as const,
  message: "Improve clarity",
  explicitConsent: true,
  uiState: "error" as const,
  errorMessage: "failed",
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
  specialistFields: {
    ...EMPTY_SPECIALIST_FIELDS,
    resumeBullets: "Built APIs",
    resumeSkills: "TypeScript",
  },
  onSpecialistFieldChange: () => undefined,
  pilotPresentation: true,
  onDismissError: () => undefined,
};

describe("CareerChatWorkspaceView error recovery", () => {
  it("renders the pilot error panel without crashing on incomplete responses", () => {
    expect(() =>
      render(
        <CareerChatWorkspaceView
          {...baseViewProps}
          response={
            {
              status: "completed",
              intent: "analyze_resume",
            } as never
          }
          uiState="completed"
          errorMessage={null}
        />,
      ),
    ).not.toThrow();
  });

  it("shows the recovery panel when errorMessage is set in pilot mode", () => {
    render(<CareerChatWorkspaceView {...baseViewProps} response={null} />);

    expect(screen.getByTestId("career-pilot-analysis-error")).toBeTruthy();
    expect(screen.getByText(CAREER_PILOT_ERROR_TITLE)).toBeTruthy();
    expect(screen.getByText(CAREER_PILOT_ERROR_DESCRIPTION)).toBeTruthy();
    expect(screen.queryByTestId("career-pilot-result-view")).toBeNull();
  });

  it("does not crash when warnings and toolProposals are missing on a partial response", () => {
    expect(() =>
      render(
        <CareerChatWorkspaceView
          {...baseViewProps}
          pilotPresentation={false}
          response={
            {
              status: "blocked",
              agentResult: null,
            } as never
          }
          uiState="blocked"
          errorMessage={null}
        />,
      ),
    ).not.toThrow();
  });
});

describe("CareerChatWorkspace retry flow", () => {
  beforeEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("preserves form data, shows the error panel, and completes after retry", async () => {
    const user = userEvent.setup();
    const runSpy = vi
      .spyOn(careerChatClient, "runCareerChatLibrechat")
      .mockRejectedValueOnce(new careerChatClient.CareerChatRequestError())
      .mockResolvedValueOnce(completedResponse);

    const view = render(
      <CareerChatWorkspace
        careerBundle={null}
        selectedSignalIds={[]}
        availableSignals={[]}
        pilotPresentation
        pilotIntent="analyze_resume"
        initialSpecialistFields={{
          ...EMPTY_SPECIALIST_FIELDS,
          resumeBullets: "Built APIs",
          resumeSkills: "TypeScript",
        }}
      />,
    );

    const panel = within(view.getByTestId("career-chat-workspace-panel"));
    const bullets = panel.getByTestId("career-chat-resume-bullets") as HTMLTextAreaElement;
    const skills = panel.getByTestId("career-chat-resume-skills") as HTMLInputElement;

    await user.click(panel.getByTestId("career-chat-consent-checkbox"));
    await user.click(panel.getByTestId("career-chat-send-button"));

    await waitFor(() => {
      expect(panel.getByTestId("career-pilot-analysis-error")).toBeTruthy();
    });
    expect(panel.queryByTestId("career-pilot-result-view")).toBeNull();
    expect(bullets.value).toBe("Built APIs");
    expect(skills.value).toBe("TypeScript");

    await user.click(panel.getByTestId("career-pilot-analysis-retry"));

    await waitFor(() => {
      expect(panel.getByTestId("career-pilot-result-view")).toBeTruthy();
    });

    expect(runSpy).toHaveBeenCalledTimes(2);
    expect(bullets.value).toBe("Built APIs");
    expect(skills.value).toBe("TypeScript");
    expect(panel.queryByTestId("career-pilot-analysis-error")).toBeNull();
  });
});
