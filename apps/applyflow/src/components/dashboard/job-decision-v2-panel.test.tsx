// @vitest-environment jsdom
import { StrictMode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  addResumeVariant,
  createResumeLibraryFromProfile,
  EMPTY_ANSWER_BANK,
  validateCandidateProfile,
  type ApplyFlowApplicationV2Envelope,
  type ApplyFlowJob,
} from "@devflow/applyflow-core";

import { APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY } from "@/lib/local-analytics-storage";
import { persistDashboardJobs } from "@/lib/local-job-storage";
import { persistResumeLibrary } from "@/lib/local-resume-library-storage";
import { persistApplicationWithOutcome } from "@/lib/persist-application-decision";

import { JobDecisionV2Panel } from "./job-decision-v2-panel";
import { testBootstrapV1 } from "./test-persistence-bootstrap";
import {
  JOB_DECISION_V2_MISSING,
  JOB_DECISION_V2_PACK_NEEDS_CONFIRMATION,
  JOB_DECISION_V2_TITLE,
} from "./job-decision-v2-content";

const jobA: ApplyFlowJob = {
  id: "job_a",
  title: "Product Engineer",
  company: "Acme",
  source: "paste",
  status: "reviewing",
  jobContext: { skills: ["React"] },
  jobMatch: {
    score: 100,
    decision: "apply",
    matchedSkills: ["React"],
    missingSkills: [],
    evaluatedAt: "2026-08-13T12:00:00.000Z",
    scoringVersion: "v1",
  },
  createdAt: "2026-08-13T12:00:00.000Z",
  updatedAt: "2026-08-13T12:00:00.000Z",
};

const jobB: ApplyFlowJob = {
  ...jobA,
  id: "job_b",
  title: "Staff Engineer",
  company: "Globex",
};

afterEach(() => {
  window.localStorage.clear();
  cleanup();
});

function persistLanguageMismatchLibrary() {
  const profile = (language: "en" | "pt", skills: Record<string, number>) =>
    validateCandidateProfile({
      name: "Candidato Sintético",
      location: "Santos, SP, Brazil",
      englishLevel: "Advanced",
      roles: ["Senior Full Stack Engineer"],
      skills,
      facts: { location: "Santos, SP, Brazil", totalYearsExperience: 6, remotePreference: "remote", englishLevel: "Advanced" },
      answerBank: { ...EMPTY_ANSWER_BANK, tellUsAboutYourself: `${language === "en" ? "EN" : "PT"} intro: React and TypeScript.` },
    });
  const stack = { React: 6, Nextjs: 3, TypeScript: 5, Nodejs: 6 };
  const now = new Date("2026-10-27T15:00:00.000Z");
  const seeded = createResumeLibraryFromProfile(profile("pt", { ...stack, PostgreSQL: 3 }), {
    now,
    id: "rv_pt",
    name: "CV ATS PT-BR 2026",
  });
  const added = addResumeVariant(seeded, { profile: profile("en", stack), name: "CV ATS EN 2026", id: "rv_en", now });
  if (!added.ok) throw new Error(added.error);
  persistResumeLibrary(added.library);
}

describe("JobDecisionV2Panel", () => {
  it("I20C mostra a confirmação de idioma na preparação e no pack", () => {
    persistLanguageMismatchLibrary();
    persistDashboardJobs([
      {
        ...jobA,
        descriptionSnapshot:
          "We are looking for a Senior Software Engineer. Remote - Brazil. PostgreSQL. React, Next.js, TypeScript and Node.js. Minimum 5 years.",
      },
    ]);
    render(<JobDecisionV2Panel jobId={jobA.id} persistenceBootstrap={testBootstrapV1} />);

    fireEvent.click(screen.getByTestId("application-readiness-toggle"));
    expect(screen.getByText(/Confirme o idioma do currículo/)).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Pack" }));
    expect(screen.getByTestId("job-decision-v2-pack-confirmation").textContent).toContain(
      JOB_DECISION_V2_PACK_NEEDS_CONFIRMATION,
    );
  });

  it("renderiza o estado de carregamento no servidor", () => {
    const html = renderToStaticMarkup(<JobDecisionV2Panel jobId="missing" persistenceBootstrap={testBootstrapV1} />);
    expect(html).toContain("A carregar");
    expect(html).not.toContain(JOB_DECISION_V2_TITLE);
  });

  it("mostra vaga em falta depois da hidratação", () => {
    render(<JobDecisionV2Panel jobId="missing" persistenceBootstrap={testBootstrapV1} />);
    expect(screen.getByText(JOB_DECISION_V2_MISSING)).toBeTruthy();
    expect(screen.queryByText("A carregar…")).toBeNull();
  });

  it("atualiza a vaga quando o jobId muda", () => {
    persistDashboardJobs([jobA, jobB]);
    const { rerender } = render(<JobDecisionV2Panel jobId={jobA.id} persistenceBootstrap={testBootstrapV1} />);
    expect(screen.getByText(/Product Engineer/)).toBeTruthy();
    expect(screen.queryByText(/Staff Engineer/)).toBeNull();

    rerender(<JobDecisionV2Panel jobId={jobB.id} persistenceBootstrap={testBootstrapV1} />);
    expect(screen.getByText(/Staff Engineer/)).toBeTruthy();
    expect(screen.queryByText(/Product Engineer/)).toBeNull();
  });

  it("não duplica eventos de backfill quando o render se repete", async () => {
    persistDashboardJobs([jobA]);
    const applied: ApplyFlowApplicationV2Envelope = {
      id: "app-1",
      createdAt: "2026-09-09T12:00:00.000Z",
      updatedAt: "2026-09-15T03:04:24.620Z",
      source: "paste",
      status: "applied",
      v2: { sourceJobId: jobA.id },
    };
    expect(
      persistApplicationWithOutcome({
        application: applied,
        outcome: {
          applicationId: "app-1",
          createdAt: "2026-09-09T12:00:00.000Z",
          updatedAt: "2026-09-09T12:00:00.000Z",
          snapshot: {
            capturedAt: "2026-09-09T12:00:00.000Z",
            overallFit: 70,
            dimensions: {
              overall: 70,
              coreEngineering: 70,
              stack: 70,
              specialization: 70,
              seniority: 70,
              product: 70,
            },
            decision: "apply_normal",
            priority: 60,
            requirements: [],
            supportingEvidenceIds: [],
            primaryCaseIds: [],
          },
        },
      }).ok,
    ).toBe(true);

    render(
      <StrictMode>
        <JobDecisionV2Panel jobId={jobA.id} persistenceBootstrap={testBootstrapV1} />
      </StrictMode>,
    );

    await waitFor(() => {
      const analytics = JSON.parse(
        window.localStorage.getItem(APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY) ?? "{}",
      ) as { events?: { type: string; source?: string }[] };
      const applied = (analytics.events ?? []).filter(
        (item) => item.type === "applied" && item.source === "backfill",
      );
      expect(applied).toHaveLength(1);
    });
  });

  it("shows derived next-action and factual age copy without fabricating employer silence", async () => {
    persistDashboardJobs([jobA]);
    const applied: ApplyFlowApplicationV2Envelope = {
      id: "app-next",
      createdAt: "2026-09-09T12:00:00.000Z",
      updatedAt: "2026-09-15T03:04:24.620Z",
      source: "paste",
      status: "applied",
      appliedAt: "2026-09-15T03:04:24.620Z",
      v2: { sourceJobId: jobA.id },
    };
    expect(
      persistApplicationWithOutcome({
        application: applied,
        outcome: {
          applicationId: "app-next",
          createdAt: "2026-09-09T12:00:00.000Z",
          updatedAt: "2026-09-15T03:04:24.620Z",
          appliedAt: "2026-09-15T03:04:24.620Z",
          snapshot: {
            capturedAt: "2026-09-09T12:00:00.000Z",
            overallFit: 70,
            dimensions: {
              overall: 70,
              coreEngineering: 70,
              stack: 70,
              specialization: 70,
              seniority: 70,
              product: 70,
            },
            decision: "apply_normal",
            priority: 60,
            requirements: [],
            supportingEvidenceIds: [],
            primaryCaseIds: [],
          },
        },
      }).ok,
    ).toBe(true);

    render(<JobDecisionV2Panel jobId={jobA.id} persistenceBootstrap={testBootstrapV1} />);

    await waitFor(() => {
      expect(screen.getByTestId("application-next-action").textContent).toMatch(/follow-up/i);
      expect(screen.getByTestId("application-age-copy").textContent).toMatch(/Registrada|Atualizada|Aplicada/);
      expect(screen.getByTestId("application-age-copy").textContent?.toLowerCase()).not.toContain("respondeu");
    });
  });

  it("renders current status without inventing a timeline when no events exist", async () => {
    persistDashboardJobs([jobA]);
    const reviewing: ApplyFlowApplicationV2Envelope = {
      id: "app-hist",
      createdAt: "2026-09-09T12:00:00.000Z",
      updatedAt: "2026-09-09T12:00:00.000Z",
      source: "paste",
      status: "reviewing",
      v2: { sourceJobId: jobA.id },
    };
    expect(
      persistApplicationWithOutcome({
        application: reviewing,
        outcome: {
          applicationId: "app-hist",
          createdAt: "2026-09-09T12:00:00.000Z",
          updatedAt: "2026-09-09T12:00:00.000Z",
          snapshot: {
            capturedAt: "2026-09-09T12:00:00.000Z",
            overallFit: 70,
            dimensions: {
              overall: 70,
              coreEngineering: 70,
              stack: 70,
              specialization: 70,
              seniority: 70,
              product: 70,
            },
            decision: "apply_normal",
            priority: 60,
            requirements: [],
            supportingEvidenceIds: [],
            primaryCaseIds: [],
          },
        },
      }).ok,
    ).toBe(true);

    render(<JobDecisionV2Panel jobId={jobA.id} persistenceBootstrap={testBootstrapV1} />);

    await waitFor(() => {
      expect(screen.getByTestId("application-current-state")).toBeTruthy();
    });
    expect(screen.queryByTestId("application-lifecycle-timeline")).toBeNull();
  });
});
