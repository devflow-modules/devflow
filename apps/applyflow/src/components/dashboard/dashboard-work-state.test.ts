import { describe, expect, it } from "vitest";

import {
  dashboardAnalyzeHref,
  dashboardNextStepId,
  dashboardWorkFlags,
  shouldShowApplicationsList,
  shouldShowInterviewPrep,
} from "./dashboard-work-state";

describe("dashboard work flags", () => {
  it("separa currículo, vagas e candidaturas", () => {
    const resumeOnly = dashboardWorkFlags({ resumeCount: 1, jobCount: 0, applicationCount: 0 });
    expect(resumeOnly).toEqual({ hasResume: true, hasJobs: false, hasApplications: false });
    expect(dashboardNextStepId(resumeOnly)).toBe("job");
    expect(shouldShowApplicationsList(resumeOnly)).toBe(false);
    expect(shouldShowInterviewPrep(resumeOnly)).toBe(false);

    const jobOnly = dashboardWorkFlags({ resumeCount: 1, jobCount: 1, applicationCount: 0 });
    expect(dashboardNextStepId(jobOnly)).toBe("analyze");
    expect(shouldShowApplicationsList(jobOnly)).toBe(false);
    expect(shouldShowInterviewPrep(jobOnly)).toBe(false);

    const applied = dashboardWorkFlags({ resumeCount: 1, jobCount: 1, applicationCount: 1 });
    expect(dashboardNextStepId(applied)).toBe("track");
    expect(shouldShowApplicationsList(applied)).toBe(true);
    expect(shouldShowInterviewPrep(applied)).toBe(true);
  });

  it("não trata vaga salva como candidatura", () => {
    const flags = dashboardWorkFlags({ resumeCount: 1, jobCount: 3, applicationCount: 0 });
    expect(flags.hasJobs).toBe(true);
    expect(flags.hasApplications).toBe(false);
  });

  it("navega para a análise da vaga mais recente quando o próximo passo é analisar", () => {
    expect(dashboardAnalyzeHref([])).toBeUndefined();
    expect(
      dashboardAnalyzeHref([
        { id: "job_old", createdAt: "2026-09-11T01:00:00.000Z", updatedAt: "2026-09-11T01:00:00.000Z" },
        { id: "job_new", createdAt: "2026-09-12T16:30:02.407Z", updatedAt: "2026-09-12T16:30:02.407Z" },
      ]),
    ).toBe("/dashboard/jobs/job_new");
  });
});
