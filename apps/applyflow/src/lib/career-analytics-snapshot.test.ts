import { afterEach, describe, expect, it, vi } from "vitest";

import { persistDashboardImport } from "./local-import-storage.js";
import { persistDashboardJobs } from "./local-job-storage.js";
import { persistDashboardContacts } from "./local-contact-storage.js";
import { loadCareerAnalyticsSnapshot } from "./career-analytics-snapshot.js";
import type { ApplyFlowJob } from "@devflow/applyflow-core";

function stubStorage(initial?: Record<string, string>) {
  const storage: Record<string, string> = { ...initial };
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => (key in storage ? storage[key]! : null),
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
    },
  });
  return storage;
}

const job: ApplyFlowJob = {
  id: "job_analytics",
  title: "Product Engineer",
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadCareerAnalyticsSnapshot", () => {
  it("devolve scorecard vazio sem dados locais", () => {
    stubStorage();
    const snapshot = loadCareerAnalyticsSnapshot();
    expect(snapshot.scorecard?.applications ?? 0).toBe(0);
    expect(snapshot.scorecard?.jobsFound ?? 0).toBe(0);
    expect(snapshot.historyApplications).toEqual([]);
  });

  it("inclui candidaturas e vagas persistidas", () => {
    stubStorage();
    persistDashboardImport([
      {
        id: "app_1",
        createdAt: "2026-08-13T12:00:00.000Z",
        updatedAt: "2026-08-13T12:00:00.000Z",
        source: "linkedin",
        status: "applied",
      },
    ]);
    persistDashboardJobs([job]);
    const snapshot = loadCareerAnalyticsSnapshot();
    expect(snapshot.historyApplications).toHaveLength(1);
    expect(snapshot.scorecard?.jobsFound).toBe(1);
  });

  it("expõe métricas de outreach manual sem contar draft como envio", () => {
    stubStorage();
    persistDashboardContacts(
      [
        {
          id: "prepared",
          applicationId: "app_1",
          jobId: job.id,
          name: "Alex Morgan",
          type: "recruiter",
          status: "MESSAGE_PREPARED",
          createdAt: "2026-09-22T12:00:00.000Z",
          updatedAt: "2026-09-22T12:00:00.000Z",
        },
        {
          id: "replied",
          applicationId: "app_1",
          jobId: job.id,
          name: "Taylor Jordan",
          type: "hiring_manager",
          status: "REPLIED",
          sentAt: "2026-09-22T12:00:00.000Z",
          repliedAt: "2026-09-23T12:00:00.000Z",
          createdAt: "2026-09-22T12:00:00.000Z",
          updatedAt: "2026-09-23T12:00:00.000Z",
        },
      ],
      [],
    );
    const snapshot = loadCareerAnalyticsSnapshot();
    expect(snapshot.outreach).toMatchObject({ prepared: 1, sent: 1, replied: 1, responseRate: 1 });
  });
});
