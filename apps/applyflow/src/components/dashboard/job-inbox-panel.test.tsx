import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { JobInboxPanel } from "./job-inbox-panel";
import {
  CURRICULUM_ROUTER_COMPARE_LABEL,
  CURRICULUM_ROUTER_SKIP_HINT,
  CURRICULUM_ROUTER_TITLE,
  JOB_INBOX_SUBMIT_LABEL,
  JOB_INBOX_TITLE,
  JOB_MATCH_DECISION_LABELS,
  jobMatchDecisionTone,
} from "./job-inbox-content";
import type { ApplyFlowJob, CurriculumRecommendation } from "@devflow/applyflow-core";

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
});
