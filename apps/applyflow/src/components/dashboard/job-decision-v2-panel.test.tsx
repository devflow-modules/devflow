// @vitest-environment jsdom
import { StrictMode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ApplyFlowApplicationV2Envelope, ApplyFlowJob } from "@devflow/applyflow-core";

import { APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY } from "@/lib/local-analytics-storage";
import { persistDashboardJobs } from "@/lib/local-job-storage";
import { persistApplicationWithOutcome } from "@/lib/persist-application-decision";

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
        <JobDecisionV2Panel jobId={jobA.id} />
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
});
