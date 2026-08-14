import { describe, expect, it, vi } from "vitest";

import {
  APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY,
  clearPersistedDashboardJobs,
  loadDashboardJobs,
  persistDashboardJobs,
} from "./local-job-storage.js";
import type { ApplyFlowJob } from "@devflow/applyflow-core";

const job: ApplyFlowJob = {
  id: "job_1",
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

describe("local-job-storage", () => {
  it("persiste e recarrega vagas do inbox", () => {
    const storage: Record<string, string> = {};
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => (k in storage ? storage[k]! : null),
        setItem: (k: string, v: string) => {
          storage[k] = v;
        },
        removeItem: (k: string) => {
          delete storage[k];
        },
      },
    } as Window & typeof globalThis);

    persistDashboardJobs([job]);
    expect(loadDashboardJobs()).toHaveLength(1);
    expect(loadDashboardJobs()[0]?.id).toBe("job_1");
    clearPersistedDashboardJobs();
    expect(storage[APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]).toBeUndefined();
  });
});
