import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { JobInboxPanel } from "./job-inbox-panel";
import {
  JOB_INBOX_SUBMIT_LABEL,
  JOB_INBOX_TITLE,
  JOB_MATCH_DECISION_LABELS,
  jobMatchDecisionTone,
} from "./job-inbox-content";
import type { ApplyFlowJob } from "@devflow/applyflow-core";

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
  });
});
