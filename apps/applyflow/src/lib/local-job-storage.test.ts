import { afterEach, describe, expect, it, vi } from "vitest";

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

const jobB: ApplyFlowJob = {
  ...job,
  id: "job_2",
  title: "Staff Engineer",
};

function stubStorage(initial?: Record<string, string>) {
  const storage: Record<string, string> = { ...initial };
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
  return storage;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("local-job-storage", () => {
  it("persiste e recarrega vagas do inbox", () => {
    const storage = stubStorage();
    persistDashboardJobs([job]);
    const loaded = loadDashboardJobs();
    expect(loaded.status).toBe("ok");
    expect(loaded.jobs).toHaveLength(1);
    expect(loaded.jobs[0]?.id).toBe("job_1");
    expect(loaded.jobs[0]?.applicationPack).toBeUndefined();

    const packed: ApplyFlowJob = {
      ...job,
      applicationPack: {
        version: 1,
        packVersion: "application-pack-v1",
        createdAt: "2026-08-18T15:00:00.000Z",
        updatedAt: "2026-08-18T15:00:00.000Z",
        jobId: job.id,
        resume: { variantId: "rv_product", variantName: "Product Engineer", recommendedByRouter: true },
        match: {
          score: 100,
          decision: "apply",
          matchedSkills: ["React"],
          missingSkills: ["AWS"],
          scoringVersion: "v1",
        },
        highlights: ["React"],
        gaps: ["AWS"],
        candidateFacts: { name: "Gustavo Marques" },
        checklist: [{ id: "review-resume", done: true }],
      },
    };
    persistDashboardJobs([packed]);
    expect(loadDashboardJobs().jobs[0]?.applicationPack?.resume.variantName).toBe("Product Engineer");
    expect(loadDashboardJobs().jobs[0]?.applicationPack?.checklist[0]?.done).toBe(true);
    clearPersistedDashboardJobs();
    expect(storage[APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]).toBeUndefined();
  });

  it("primeira visita sem chave devolve inbox vazio sem persistir", () => {
    const storage = stubStorage();
    const loaded = loadDashboardJobs();
    expect(loaded).toEqual({ jobs: [], status: "empty", ignoredCount: 0 });
    expect(storage[APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]).toBeUndefined();
  });

  it("job parcial sem jobMatch não derruba o load e não reescreve o blob", () => {
    const raw = JSON.stringify({
      version: 1,
      savedAt: "2026-08-19T12:00:00.000Z",
      jobs: [{ id: "no-match", title: "Broken" }],
    });
    const storage = stubStorage({ [APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]: raw });
    const loaded = loadDashboardJobs();
    expect(loaded.status).toBe("partial");
    expect(loaded.jobs).toEqual([]);
    expect(loaded.ignoredCount).toBe(1);
    expect(storage[APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]).toBe(raw);
  });

  it("coleção mista preserva os jobs válidos e isola o inválido", () => {
    const raw = JSON.stringify({
      version: 1,
      savedAt: "2026-08-19T12:00:00.000Z",
      jobs: [job, { id: "no-match" }, jobB],
    });
    const storage = stubStorage({ [APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]: raw });
    const loaded = loadDashboardJobs();
    expect(loaded.status).toBe("partial");
    expect(loaded.jobs.map((item) => item.id)).toEqual(["job_1", "job_2"]);
    expect(loaded.ignoredCount).toBe(1);
    expect(storage[APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]).toBe(raw);
  });

  it("JSON quebrado apresenta recovery e preserva o blob", () => {
    const raw = "{not-json";
    const storage = stubStorage({ [APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]: raw });
    const loaded = loadDashboardJobs();
    expect(loaded.status).toBe("unreadable");
    expect(loaded.reason).toBe("malformed-json");
    expect(loaded.jobs).toEqual([]);
    expect(storage[APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]).toBe(raw);
  });

  it("versão desconhecida apresenta recovery e preserva o blob", () => {
    const raw = JSON.stringify({ version: 99, savedAt: "2026-08-19T12:00:00.000Z", jobs: [job] });
    const storage = stubStorage({ [APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]: raw });
    const loaded = loadDashboardJobs();
    expect(loaded.status).toBe("unreadable");
    expect(loaded.reason).toBe("unknown-version");
    expect(loaded.jobs).toEqual([]);
    expect(storage[APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]).toBe(raw);
  });
});
