import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CAREER_PILOT_CTA_LABEL,
  CAREER_PILOT_ONBOARDING_TITLE,
  CAREER_PILOT_PRIVACY_NOTICE,
} from "./career-pilot-content";
import { CareerPilotOnboarding } from "./career-pilot-onboarding";
import { CareerPilotExperience } from "./career-pilot-experience";
import { CareerChatWorkspaceView, EMPTY_SPECIALIST_FIELDS } from "./career-chat-workspace";
import { createCareerBundle } from "@devflow/career-core";

describe("CareerPilotOnboarding", () => {
  it("shows title, journey steps, privacy notice, and accessible CTA", () => {
    const html = renderToStaticMarkup(<CareerPilotOnboarding />);

    expect(html).toContain(CAREER_PILOT_ONBOARDING_TITLE);
    expect(html).toContain("Analisar currículo");
    expect(html).toContain("Comparar com uma vaga");
    expect(html).toContain("Criar plano de carreira");
    expect(html).toContain(CAREER_PILOT_PRIVACY_NOTICE);
    expect(html).toContain(CAREER_PILOT_CTA_LABEL);
    expect(html).toContain('data-testid="career-pilot-start-cta"');
  });
});

describe("CareerChatWorkspaceView pilot presentation", () => {
  it("shows only the three pilot intents with analyze_resume-friendly labels", () => {
    const html = renderToStaticMarkup(
      <CareerChatWorkspaceView
        careerBundle={null}
        selectedSignalIds={[]}
        availableSignals={[]}
        action="analyze_resume"
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
        specialistFields={EMPTY_SPECIALIST_FIELDS}
        onSpecialistFieldChange={() => undefined}
        pilotPresentation
        pilotMode
        submitDisabled
      />,
    );

    expect(html).toContain("Analisar currículo");
    expect(html).toContain("Comparar com uma vaga");
    expect(html).toContain("Criar plano de carreira");
    expect(html).not.toContain("Prepare interview");
    expect(html).not.toContain("Analyze application fit");
    expect(html).not.toContain("CareerBundle");
    expect(html).not.toContain("Approve once");
    expect(html).not.toContain("Execution trace");
  });
});

describe("CareerPilotExperience", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_CAREER_PILOT_MODE", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders onboarding and workspace without provider consent surfaces", () => {
    const html = renderToStaticMarkup(<CareerPilotExperience />);

    expect(html).toContain(CAREER_PILOT_ONBOARDING_TITLE);
    expect(html).toContain("Preencher com exemplo");
    expect(html).toContain('data-testid="career-chat-workspace-panel"');
    expect(html).not.toContain("provider-consent");
    expect(html).not.toContain("Gmail");
    expect(html).not.toContain("Google Calendar");
    expect(html).not.toContain("Nango");
  });
});

describe("CareerChatWorkspaceView non-pilot regression", () => {
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

  it("keeps full action list outside pilot presentation", () => {
    const html = renderToStaticMarkup(
      <CareerChatWorkspaceView
        careerBundle={bundle}
        selectedSignalIds={[]}
        availableSignals={[]}
        action="prepare_interview"
        message="Focus"
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
        pilotPresentation={false}
      />,
    );

    expect(html).toContain("Prepare interview");
    expect(html).toContain("Career Chat Workspace");
  });
});
