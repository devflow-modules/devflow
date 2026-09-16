import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApplyFlowJob } from "@devflow/applyflow-core";

import { persistDashboardJobs } from "./local-job-storage.js";
import { loadJobDecisionV2Snapshot } from "./job-decision-v2-snapshot.js";

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
  vi.unstubAllGlobals();
});

describe("loadJobDecisionV2Snapshot", () => {
  it("devolve job nulo quando a vaga não existe", () => {
    stubStorage();
    const snapshot = loadJobDecisionV2Snapshot("missing");
    expect(snapshot.job).toBeNull();
    expect(snapshot.decision).toBeNull();
  });

  it("seleciona a vaga pedida e muda quando o id muda", () => {
    stubStorage();
    persistDashboardJobs([jobA, jobB]);
    expect(loadJobDecisionV2Snapshot(jobA.id).job?.title).toBe("Product Engineer");
    expect(loadJobDecisionV2Snapshot(jobB.id).job?.title).toBe("Staff Engineer");
  });
});
