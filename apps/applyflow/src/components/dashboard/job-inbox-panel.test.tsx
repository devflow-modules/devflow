import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { JobInboxPanel } from "./job-inbox-panel";
import {
  APPLICATION_PACK_ANSWERS_HINT,
  APPLICATION_PACK_ANSWERS_LABEL,
  APPLICATION_PACK_HINT,
  APPLICATION_PACK_OPEN_LABEL,
  APPLICATION_PACK_PREPARE_LABEL,
  APPLICATION_PACK_ROUTER_HINT,
  APPLICATION_PACK_SELECT_LABEL,
  CURRICULUM_ROUTER_COMPARE_LABEL,
  CURRICULUM_ROUTER_SKIP_HINT,
  CURRICULUM_ROUTER_TITLE,
  JOB_INBOX_SUBMIT_LABEL,
  JOB_INBOX_TITLE,
  JOB_MATCH_DECISION_LABELS,
  jobMatchDecisionTone,
} from "./job-inbox-content";
import {
  addResumeVariant,
  createResumeLibraryFromProfile,
  gustavoProfile,
  type ApplyFlowJob,
  type CurriculumRecommendation,
  type ResumeLibrary,
} from "@devflow/applyflow-core";

const stretchJob: ApplyFlowJob = {
  id: "job_stretch",
  title: "Backend Engineer",
  company: "Acme",
  source: "paste",
  status: "reviewing",
  jobContext: { skills: ["React", "Kubernetes"] },
  jobMatch: {
    score: 67,
    decision: "stretch",
    matchedSkills: ["React"],
    missingSkills: ["Kubernetes"],
    evaluatedAt: "2026-08-13T12:00:00.000Z",
    scoringVersion: "v1",
  },
  createdAt: "2026-08-13T12:00:00.000Z",
  updatedAt: "2026-08-13T12:00:00.000Z",
};

const recommendation: CurriculumRecommendation = {
  recommendedVariantId: "rv_product",
  recommendedVariantName: "Product Engineer",
  evaluatedAt: "2026-08-17T15:00:00.000Z",
  scoringVersion: "v1",
  routerVersion: "curriculum-router-v1",
  confidence: "clear",
  scoreDelta: 17,
  runnerUpVariantId: "rv_frontend",
  runnerUpVariantName: "Frontend React/Next.js",
  candidates: [
    {
      variantId: "rv_product",
      variantName: "Product Engineer",
      score: 92,
      decision: "apply",
      matchedSkills: ["Node.js", "PostgreSQL"],
      missingSkills: ["AWS"],
    },
    {
      variantId: "rv_frontend",
      variantName: "Frontend React/Next.js",
      score: 75,
      decision: "stretch",
      matchedSkills: ["React"],
      missingSkills: ["Node.js"],
    },
  ],
};

const routedJob: ApplyFlowJob = {
  ...stretchJob,
  id: "job_routed",
  evaluatedWith: { variantId: "rv_frontend", variantName: "Frontend React/Next.js" },
  curriculumRecommendation: recommendation,
};

const skipRoutedJob: ApplyFlowJob = {
  ...stretchJob,
  id: "job_skip_routed",
  status: "ignored",
  jobMatch: {
    ...stretchJob.jobMatch,
    score: 33,
    decision: "skip",
    matchedSkills: ["Java"],
    missingSkills: ["Elixir", "Ruby"],
  },
  evaluatedWith: { variantId: "rv_product", variantName: "Product Engineer" },
  curriculumRecommendation: {
    ...recommendation,
    scoreDelta: 33,
    candidates: [
      { ...recommendation.candidates[0]!, score: 33, decision: "skip" },
      { ...recommendation.candidates[1]!, score: 0, decision: "skip" },
    ],
  },
};

function twoVariantLibrary(): ResumeLibrary {
  const seeded = createResumeLibraryFromProfile(gustavoProfile, {
    name: "Product Engineer",
    id: "rv_product",
  });
  const added = addResumeVariant(seeded, {
    profile: gustavoProfile,
    name: "Frontend React/Next.js",
    id: "rv_frontend",
  });
  if (!added.ok) throw new Error(added.error);
  return added.library;
}

const packedJob: ApplyFlowJob = {
  ...routedJob,
  id: "job_packed",
  url: "https://example.com/jobs/backend",
  applicationPack: {
    version: 1,
    packVersion: "application-pack-v1",
    createdAt: "2026-08-18T15:00:00.000Z",
    updatedAt: "2026-08-18T15:00:00.000Z",
    jobId: "job_packed",
    resume: { variantId: "rv_product", variantName: "Product Engineer", recommendedByRouter: true },
    match: {
      score: 92,
      decision: "apply",
      matchedSkills: ["Node.js", "PostgreSQL"],
      missingSkills: ["AWS"],
      scoringVersion: "v1",
    },
    highlights: ["Node.js", "PostgreSQL"],
    gaps: ["AWS"],
    candidateFacts: {
      name: "Gustavo Marques",
      location: "Brazil",
      englishLevel: "Advanced",
      answerBank: { professionalSummary: "I am a Senior Frontend / Full-Stack Software Engineer." },
    },
    checklist: [
      { id: "review-resume", done: false },
      { id: "review-highlights", done: false },
      { id: "review-gaps", done: false },
      { id: "review-answers", done: false },
      { id: "open-job", done: false },
      { id: "mark-applied", done: false },
    ],
  },
};

describe("job-inbox-content", () => {
  it("mapeia decisões para tons distintos", () => {
    expect(jobMatchDecisionTone("apply")).toBe("success");
    expect(jobMatchDecisionTone("stretch")).toBe("warning");
    expect(jobMatchDecisionTone("skip")).toBe("danger");
  });
});

describe("JobInboxPanel", () => {
  it("mostra o recorte F1 e a decisão da vaga avaliada", () => {
    const html = renderToStaticMarkup(
      <JobInboxPanel
        jobs={[stretchJob]}
        error={null}
        evaluatedWithName="Product Engineer"
        onEvaluatePaste={() => undefined}
      />,
    );
    expect(html).toContain(JOB_INBOX_TITLE);
    expect(html).toContain(JOB_INBOX_SUBMIT_LABEL);
    expect(html).toContain(JOB_MATCH_DECISION_LABELS.stretch);
    expect(html).toContain("67/100");
    expect(html).toContain("Backend Engineer");
    expect(html).toContain("Avaliado com:");
    expect(html).toContain("Product Engineer");
    expect(html).not.toContain(CURRICULUM_ROUTER_TITLE);
    expect(html).not.toContain(CURRICULUM_ROUTER_COMPARE_LABEL);
  });

  it("mostra o Router separado do Job Match quando há 2+ variantes", () => {
    const html = renderToStaticMarkup(
      <JobInboxPanel
        jobs={[routedJob]}
        error={null}
        evaluatedWithName="Frontend React/Next.js"
        onEvaluatePaste={() => undefined}
      />,
    );
    expect(html).toContain(CURRICULUM_ROUTER_TITLE);
    expect(html).toContain("Product Engineer");
    expect(html).toContain("92/100");
    expect(html).toContain("Vantagem: +17 sobre Frontend React/Next.js");
    expect(html).toContain(CURRICULUM_ROUTER_COMPARE_LABEL);
    expect(html).toContain("O currículo padrão não é alterado");
    expect(html).toContain("O score da vaga usa Frontend React/Next.js");
  });

  it("em SKIP prioriza a decisão da vaga e não destaca o currículo recomendado", () => {
    const html = renderToStaticMarkup(
      <JobInboxPanel
        jobs={[skipRoutedJob]}
        error={null}
        evaluatedWithName="Product Engineer"
        onEvaluatePaste={() => undefined}
      />,
    );
    expect(html).toContain(JOB_MATCH_DECISION_LABELS.skip);
    expect(html).not.toContain(CURRICULUM_ROUTER_TITLE);
    expect(html).toContain(CURRICULUM_ROUTER_COMPARE_LABEL);
    expect(html).toContain(CURRICULUM_ROUTER_SKIP_HINT);
  });

  it("mostra Preparar candidatura em APPLY/STRETCH e pré-seleciona o currículo recomendado", () => {
    const html = renderToStaticMarkup(
      <JobInboxPanel
        jobs={[routedJob]}
        error={null}
        evaluatedWithName="Frontend React/Next.js"
        resumeLibrary={twoVariantLibrary()}
        onEvaluatePaste={() => undefined}
        onCreateApplicationPack={() => undefined}
      />,
    );
    expect(html).toContain(APPLICATION_PACK_PREPARE_LABEL);
    expect(html).toContain(APPLICATION_PACK_SELECT_LABEL);
    expect(html).toContain(APPLICATION_PACK_ROUTER_HINT);
    expect(html).toContain('value="rv_product"');
    expect(html).not.toContain(APPLICATION_PACK_OPEN_LABEL);
  });

  it("não mostra o CTA principal em SKIP mesmo com biblioteca e handler", () => {
    const html = renderToStaticMarkup(
      <JobInboxPanel
        jobs={[skipRoutedJob]}
        error={null}
        evaluatedWithName="Product Engineer"
        resumeLibrary={twoVariantLibrary()}
        onEvaluatePaste={() => undefined}
        onCreateApplicationPack={() => undefined}
      />,
    );
    expect(html).toContain(JOB_MATCH_DECISION_LABELS.skip);
    expect(html).not.toContain(APPLICATION_PACK_PREPARE_LABEL);
    expect(html).not.toContain(APPLICATION_PACK_OPEN_LABEL);
  });

  it("depois de criado, abre o Pack histórico sem regenerar", () => {
    const html = renderToStaticMarkup(
      <JobInboxPanel
        jobs={[packedJob]}
        error={null}
        evaluatedWithName="Frontend React/Next.js"
        resumeLibrary={twoVariantLibrary()}
        onEvaluatePaste={() => undefined}
        onCreateApplicationPack={() => undefined}
        onTogglePackChecklist={() => undefined}
        onMarkJobApplied={() => undefined}
      />,
    );
    expect(html).not.toContain(APPLICATION_PACK_PREPARE_LABEL);
    expect(html).toContain(APPLICATION_PACK_OPEN_LABEL);
    expect(html).toContain("Product Engineer");
    expect(html).toContain("APPLY · 92/100");
    expect(html).toContain("✓ Node.js");
    expect(html).toContain("△ AWS");
    expect(html).toContain(APPLICATION_PACK_HINT);
    expect(html).toContain(APPLICATION_PACK_ANSWERS_LABEL);
    expect(html).toContain(APPLICATION_PACK_ANSWERS_HINT);
    expect(html).not.toContain("respostas geradas");
    expect(html).toContain("https://example.com/jobs/backend");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("Marcar como aplicada");
  });
});
