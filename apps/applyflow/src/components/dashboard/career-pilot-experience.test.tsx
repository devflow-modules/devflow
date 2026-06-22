import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CAREER_PILOT_CTA_LABEL,
  CAREER_PILOT_EYEBROW,
  CAREER_PILOT_ONBOARDING_TITLE,
  CAREER_PILOT_PRIVACY_NOTICE,
} from "./career-pilot-content";
import { CareerPilotOnboarding } from "./career-pilot-onboarding";
import { CareerPilotExperience } from "./career-pilot-experience";
import { CareerChatWorkspaceView, EMPTY_SPECIALIST_FIELDS } from "./career-chat-workspace";
import { CareerJourneyStepper } from "./career-journey-stepper";
import { CareerAnalysisLoading } from "./career-analysis-loading";
import { CareerScoreIndicator, scoreQualitativeLabel } from "./career-score-indicator";
import { createCareerBundle } from "@devflow/career-core";
import type { CareerPilotResultModel } from "./career-pilot-result-mapper";
import { CareerPilotResultView } from "./career-pilot-result-view";

describe("CareerPilotOnboarding", () => {
  it("shows product header, journey steps, privacy notice, and accessible CTA", () => {
    const html = renderToStaticMarkup(<CareerPilotOnboarding />);

    expect(html).toContain(CAREER_PILOT_EYEBROW);
    expect(html).toContain(CAREER_PILOT_ONBOARDING_TITLE);
    expect(html).toContain("Currículo");
    expect(html).toContain("Vaga");
    expect(html).toContain("Plano de carreira");
    expect(html).toContain(CAREER_PILOT_PRIVACY_NOTICE);
    expect(html).toContain(CAREER_PILOT_CTA_LABEL);
    expect(html).toContain('data-testid="career-pilot-start-cta"');
  });
});

describe("CareerJourneyStepper", () => {
  it("marks the active step with aria-current", () => {
    const html = renderToStaticMarkup(
      <CareerJourneyStepper
        activeIntent="analyze_resume"
        completedIntents={new Set()}
        onSelectIntent={() => undefined}
      />,
    );

    expect(html).toContain('aria-current="step"');
    expect(html).toContain('data-testid="career-journey-step-analyze_resume"');
  });

  it("does not mark upcoming steps as completed without results", () => {
    const html = renderToStaticMarkup(
      <CareerJourneyStepper
        activeIntent="analyze_ats_compatibility"
        completedIntents={new Set(["analyze_resume"])}
        onSelectIntent={() => undefined}
      />,
    );

    expect(html).toContain('data-state="completed"');
    expect(html).toContain('data-state="active"');
    expect(html).toContain('data-state="upcoming"');
  });
});

describe("CareerAnalysisLoading", () => {
  it("exposes an accessible live region", () => {
    const html = renderToStaticMarkup(<CareerAnalysisLoading intent="analyze_resume" />);

    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Analisando a estrutura do seu currículo");
    expect(html).toContain('data-testid="career-pilot-analysis-loading"');
  });
});

describe("CareerScoreIndicator", () => {
  it("renders textual value and qualitative label", () => {
    const html = renderToStaticMarkup(
      <CareerScoreIndicator score={{ label: "Compatibilidade estimada", value: 74, max: 100 }} />,
    );

    expect(html).toContain("Compatibilidade estimada");
    expect(html).toContain("74");
    expect(html).toContain(scoreQualitativeLabel(74, 100));
    expect(html).toContain('role="progressbar"');
  });
});

describe("CareerChatWorkspaceView pilot presentation", () => {
  it("shows only the three pilot intents with button group", () => {
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
    expect(html).toContain('data-testid="career-pilot-intent-group"');
    expect(html).not.toContain("Prepare interview");
    expect(html).not.toContain("Analyze application fit");
    expect(html).not.toContain("CareerBundle");
    expect(html).not.toContain("Approve once");
    expect(html).not.toContain("Execution trace");
    expect(html).not.toContain("career-chat-action-select");
  });

  it("shows accessible loading state while sending", () => {
    const html = renderToStaticMarkup(
      <CareerChatWorkspaceView
        careerBundle={null}
        selectedSignalIds={[]}
        availableSignals={[]}
        action="analyze_resume"
        message=""
        explicitConsent
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
        isSending
        specialistFields={EMPTY_SPECIALIST_FIELDS}
        onSpecialistFieldChange={() => undefined}
        pilotPresentation
        pilotMode
        submitDisabled={false}
      />,
    );

    expect(html).toContain('data-testid="career-pilot-analysis-loading"');
  });
});

describe("CareerPilotExperience", () => {
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

const model: CareerPilotResultModel = {
  flowTitle: "Análise do currículo",
  summary: "Seu currículo comunica experiência técnica, mas pode destacar resultados com mais clareza.",
  strengths: ["Experiência com TypeScript", "Histórico de entrega contínua"],
  improvements: ["Adicionar métricas nas experiências recentes"],
  nextActions: [
    "Adicione resultados mensuráveis às experiências recentes.",
    "Inclua as tecnologias obrigatórias citadas na vaga.",
  ],
  risks: ["Bullets genéricos podem reduzir impacto"],
  scores: [{ label: "Qualidade da estrutura", value: 72, max: 100 }],
  evidence: ["Experiências: detalhar impacto"],
  technicalLines: ["Nenhuma candidatura foi enviada."],
  traceSteps: [{ code: "review_required", message: "Human review required" }],
};

describe("CareerPilotResultView polish hierarchy", () => {
  it("renders participant hierarchy with technical details collapsed by default", () => {
    const html = renderToStaticMarkup(
      <CareerPilotResultView model={model} intent="analyze_resume" />,
    );

    expect(html.indexOf("Resumo")).toBeLessThan(html.indexOf("Principais achados"));
    expect(html.indexOf("Principais achados")).toBeLessThan(html.indexOf("Próximas ações"));
    expect(html.indexOf("Próximas ações")).toBeLessThan(html.indexOf("Detalhes técnicos"));
    expect(html).toContain("Análise do currículo concluída");
    expect(html).toContain('data-testid="career-pilot-score-indicator"');
    expect(html).toContain('data-testid="career-pilot-result-action-list"');
    expect(html).toContain("<details");
    expect(html).not.toContain("Agent response");
    expect(html).not.toContain("reviewRequired");
  });
});
