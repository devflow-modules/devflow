// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  createApplicationPackV2,
  evaluateJobDecisionV2,
  evidenceFromProfile,
  explainPackBlock,
  type ApplicationPack,
  type ApplyFlowJob,
  EMPTY_ANSWER_BANK,
  validateCandidateProfile,
} from "@devflow/applyflow-core";

import { ManualPreparationPanel } from "./manual-preparation-panel";
import {
  MANUAL_APPLICATION_CTA_OFFICIAL_LABEL,
  MANUAL_PREP_OPEN,
  MANUAL_PREP_TITLE,
  OFFICIAL_APPLY_URL_FIELD_LABEL,
} from "./job-inbox-content";
import { OfficialApplyUrlField } from "./official-apply-url-field";
import { ManualApplicationAction } from "./manual-application-action";

afterEach(() => {
  cleanup();
});

/** Explicit remote-BR Stefanini-like (no "Modelo híbrido" line). */
const STEFANINI_REMOTE_BR = `Desenvolvedor Full Stack (Node.js + React) Sr — Stefanini Brasil
Remoto no Brasil. Vaga 12825537.
Requisitos:
- Node.js
- React
- Experiência sênior com APIs
- Inglês intermediário
- Disponibilidade para atuar no Brasil
`;

const STEFANINI_CONTRADICTORY = `Desenvolvedor Full Stack (Node.js + React) Sr — Stefanini Brasil
Modelo híbrido. Também 100% remoto no Brasil. Vaga 12825537.
Requisitos:
- Node.js
- React
- Experiência sênior com APIs
- Inglês intermediário
- Disponibilidade para atuar no Brasil
`;

function thinProfile() {
  return validateCandidateProfile({
    name: "QA Candidate",
    roles: ["Full Stack Engineer"],
    skills: { React: 5, TypeScript: 5, Nodejs: 4 },
    salary: {},
    answerBank: EMPTY_ANSWER_BANK,
    facts: {},
  });
}

function baseJob(overrides: Partial<ApplyFlowJob> = {}): ApplyFlowJob {
  return {
    id: "job_stefanini_like",
    title: "Desenvolvedor Full Stack (Node.js + React) Sr",
    company: "Stefanini Brasil",
    source: "paste",
    status: "reviewing",
    url: "https://stefanini.gupy.io/jobs/12825537",
    descriptionSnapshot: STEFANINI_REMOTE_BR,
    jobContext: { skills: ["React", "Node.js"] },
    jobMatch: {
      score: 55,
      decision: "needs_info",
      matchedSkills: ["React"],
      missingSkills: [],
      unknownSkills: ["Node.js"],
      evaluatedAt: "2026-11-16T15:00:00.000Z",
      scoringVersion: "v1",
    },
    createdAt: "2026-11-16T15:00:00.000Z",
    updatedAt: "2026-11-16T15:00:00.000Z",
    ...overrides,
  };
}

describe("ManualPreparationPanel", () => {
  it("shows needs_info block reason, next action, and read-only prep without mutating status", () => {
    const profile = thinProfile();
    const decision = evaluateJobDecisionV2({
      jobText: STEFANINI_REMOTE_BR,
      evidence: evidenceFromProfile(profile),
      profile,
      jobId: "job_stefanini_like",
    });
    expect(decision.decision).toBe("needs_info");
    const pack = createApplicationPackV2({
      jobId: "job_stefanini_like",
      jobText: STEFANINI_REMOTE_BR,
      profile,
      evidence: evidenceFromProfile(profile),
      decision,
    });
    expect(pack.status).toBe("blocked");

    const job = baseJob();
    const explanation = explainPackBlock({
      decision,
      pack,
      profile,
      jobText: STEFANINI_REMOTE_BR,
      hasJobText: true,
      hasResume: true,
      hasSourceUrl: true,
    });

    render(
      <ManualPreparationPanel
        job={job}
        decision={decision}
        pack={pack}
        explanation={explanation}
        hasResume
        resumeName="CV ATS EN 2026"
        recommendedResumeName="CV ATS EN 2026"
        defaultOpen
      />,
    );

    expect(screen.getByTestId(`manual-prep-panel-${job.id}`).textContent).toContain(MANUAL_PREP_TITLE);
    expect(screen.getByTestId(`manual-prep-block-summary-${job.id}`).textContent).toContain(explanation.summary);
    expect(screen.getByTestId(`manual-prep-block-summary-${job.id}`).textContent).toContain(explanation.nextAction);
    expect(screen.getByTestId(`manual-prep-details-${job.id}`).textContent).toContain("CV ATS EN 2026");
    expect(screen.getByTestId(`manual-prep-open-listing-${job.id}`)).toBeTruthy();
    expect(screen.getByTestId(`manual-prep-gaps-${job.id}`)).toBeTruthy();
    expect(screen.getAllByTestId(`manual-prep-gap-check-${job.id}`).every((node) => node.hasAttribute("disabled"))).toBe(
      true,
    );
    expect(job.status).toBe("reviewing");
  });

  it("treats contradictory hybrid+remote posting as announcement verification items", () => {
    const profile = thinProfile();
    const decision = evaluateJobDecisionV2({
      jobText: STEFANINI_CONTRADICTORY,
      evidence: evidenceFromProfile(profile),
      profile,
      jobId: "job_stefanini_contradictory",
    });
    const job = baseJob({
      id: "job_stefanini_contradictory",
      descriptionSnapshot: STEFANINI_CONTRADICTORY,
    });
    const explanation = explainPackBlock({
      decision,
      profile,
      jobText: STEFANINI_CONTRADICTORY,
      hasJobText: true,
      hasResume: true,
      hasSourceUrl: true,
    });
    expect(explanation.items.some((item) => /contradição/i.test(item.label))).toBe(true);

    render(
      <ManualPreparationPanel
        job={job}
        decision={decision}
        explanation={explanation}
        hasResume
        defaultOpen
      />,
    );
    expect(screen.getByTestId(`manual-prep-block-summary-${job.id}`).textContent).toContain(explanation.summary);
    expect(screen.getByTestId(`manual-prep-details-${job.id}`).textContent).toMatch(/modelo de trabalho|contradição/i);
    expect(screen.getByTestId(`manual-prep-block-summary-${job.id}`).textContent).not.toMatch(/\blocation\b|\bseniority\b/);
    expect(job.status).toBe("reviewing");
  });

  it("Stefanini remoto BR UI does not claim Brazil location is missing from the posting", () => {
    const profile = thinProfile();
    const decision = evaluateJobDecisionV2({
      jobText: STEFANINI_REMOTE_BR,
      evidence: evidenceFromProfile(profile),
      profile,
      jobId: "job_stefanini_remote_br_ui",
    });
    const job = baseJob({ id: "job_stefanini_remote_br_ui", descriptionSnapshot: STEFANINI_REMOTE_BR });
    const explanation = explainPackBlock({
      decision,
      profile,
      jobText: STEFANINI_REMOTE_BR,
      hasJobText: true,
      hasResume: true,
      hasSourceUrl: true,
    });
    render(
      <ManualPreparationPanel job={job} decision={decision} explanation={explanation} hasResume defaultOpen />,
    );
    const summary = screen.getByTestId(`manual-prep-block-summary-${job.id}`).textContent ?? "";
    const details = screen.getByTestId(`manual-prep-details-${job.id}`).textContent ?? "";
    expect(summary).not.toMatch(/Remote locations:\s*Brazil/i);
    expect(summary).not.toMatch(/\blocation\b|\bseniority\b/);
    expect(details).not.toMatch(/Remote locations:\s*Brazil/i);
    expect(details).toMatch(/Localização no perfil|Elegibilidade de localização|Senioridade|Inglês/);
    expect(details).toMatch(/já indica Brasil|já informa a geografia/i);
    expect(summary).not.toMatch(/Confirme no anúncio oficial:.*Localiza/i);
    expect(job.status).toBe("reviewing");
  });

  it("keeps saved Wagmo-like Pack accessible inside manual prep", () => {
    const savedPack: ApplicationPack = {
      version: 1,
      packVersion: "application-pack-v1",
      createdAt: "2026-11-13T14:21:00.907Z",
      updatedAt: "2026-11-13T14:21:00.907Z",
      jobId: "job_ro_1137572",
      resume: { variantId: "rv_cv_ats_en_2026", variantName: "CV ATS EN 2026", recommendedByRouter: true },
      match: {
        score: 27,
        decision: "needs_info",
        matchedSkills: ["React"],
        missingSkills: ["LATAM clients"],
        scoringVersion: "v1",
      },
      highlights: ["React"],
      gaps: ["LATAM clients"],
      candidateFacts: { name: "QA" },
      checklist: [],
    };
    const job = baseJob({
      id: "job_ro_1137572",
      company: "Wagmo",
      title: "Senior Software Engineer LATAM",
      applicationPack: savedPack,
      jobMatch: {
        score: 71,
        decision: "apply",
        matchedSkills: ["React"],
        missingSkills: [],
        evaluatedAt: "2026-11-13T14:21:00.907Z",
        scoringVersion: "v1",
      },
    });
    const explanation = explainPackBlock({
      decision: {
        scoringVersion: "v2",
        decision: "needs_info",
        overall: 40,
        dimensions: {
          overall: 40,
          coreEngineering: 40,
          stack: 40,
          specialization: 40,
          seniority: 40,
          product: 40,
        },
        confidence: "low",
        hiringProbability: "low",
        careerUpside: "medium",
        applicationCost: "medium",
        opportunityCost: "medium",
        eliminationRisk: "medium",
        priority: 25,
        matches: [],
        claims: [],
        recommendedClaims: [],
        gates: [],
        candidateInputRequests: [],
        reasons: [],
      },
      hasJobText: true,
      hasResume: true,
      hasSourceUrl: true,
    });

    render(
      <ManualPreparationPanel
        job={job}
        savedPack={savedPack}
        explanation={explanation}
        hasResume
        defaultOpen
      />,
    );
    expect(screen.getByTestId(`manual-prep-saved-pack-${job.id}`).textContent).toContain("CV ATS EN 2026");
    expect(screen.getByTestId(`manual-prep-saved-pack-${job.id}`).textContent).toContain("LATAM clients");
  });

  it("no-pack job with official URL still exposes Abrir candidatura and shows saved URL via reliable selector", () => {
    const job = baseJob({
      jobContext: {
        skills: ["React"],
        officialApplyUrl: "https://stefanini.gupy.io/candidates/jobs/12825537/apply",
      },
    });
    const explanation = explainPackBlock({
      hasJobText: true,
      hasResume: true,
      hasSourceUrl: true,
      decision: {
        scoringVersion: "v2",
        decision: "needs_info",
        overall: 40,
        dimensions: {
          overall: 40,
          coreEngineering: 40,
          stack: 40,
          specialization: 40,
          seniority: 40,
          product: 40,
        },
        confidence: "low",
        hiringProbability: "low",
        careerUpside: "medium",
        applicationCost: "medium",
        opportunityCost: "medium",
        eliminationRisk: "medium",
        priority: 25,
        matches: [],
        claims: [],
        recommendedClaims: [],
        gates: [],
        candidateInputRequests: [],
        reasons: [],
      },
    });

    render(
      <div>
        <OfficialApplyUrlField job={job} onSaveOfficialApplyUrl={async () => undefined} />
        <ManualApplicationAction job={job} onMarkJobApplied={() => undefined} />
        <ManualPreparationPanel job={job} explanation={explanation} hasResume defaultOpen={false} />
      </div>,
    );

    const input = screen.getByLabelText(OFFICIAL_APPLY_URL_FIELD_LABEL) as HTMLInputElement;
    expect(input.value).toBe("https://stefanini.gupy.io/candidates/jobs/12825537/apply");
    expect(screen.getByTestId(`official-apply-url-input-${job.id}`)).toBe(input);
    expect(screen.getByTestId(`manual-app-open-${job.id}`).textContent).toBe(MANUAL_APPLICATION_CTA_OFFICIAL_LABEL);

    expect(screen.getByRole("button", { name: MANUAL_PREP_OPEN }).getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(screen.getByTestId(`manual-prep-toggle-${job.id}`));
    expect(screen.getByTestId(`manual-prep-details-${job.id}`)).toBeTruthy();
    expect(job.status).toBe("reviewing");
  });
});
