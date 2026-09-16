// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ApplyFlowJob } from "@devflow/applyflow-core";

import { persistDashboardJobs } from "@/lib/local-job-storage";

import { JobDecisionV2Panel } from "./job-decision-v2-panel";
import { JOB_DECISION_V2_MISSING, JOB_DECISION_V2_TITLE } from "./job-decision-v2-content";

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

describe("JobDecisionV2Panel", () => {
  it("renderiza o estado de carregamento no servidor", () => {
    const html = renderToStaticMarkup(<JobDecisionV2Panel jobId="missing" />);
    expect(html).toContain("A carregar");
    expect(html).not.toContain(JOB_DECISION_V2_TITLE);
  });

  it("mostra vaga em falta depois da hidratação", () => {
    render(<JobDecisionV2Panel jobId="missing" />);
    expect(screen.getByText(JOB_DECISION_V2_MISSING)).toBeTruthy();
    expect(screen.queryByText("A carregar…")).toBeNull();
  });

  it("atualiza a vaga quando o jobId muda", () => {
    persistDashboardJobs([jobA, jobB]);
    const { rerender } = render(<JobDecisionV2Panel jobId={jobA.id} />);
    expect(screen.getByText(/Product Engineer/)).toBeTruthy();
    expect(screen.queryByText(/Staff Engineer/)).toBeNull();

    rerender(<JobDecisionV2Panel jobId={jobB.id} />);
    expect(screen.getByText(/Staff Engineer/)).toBeTruthy();
    expect(screen.queryByText(/Product Engineer/)).toBeNull();
  });
});
