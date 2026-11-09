import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addResumeVariant,
  createResumeLibraryFromProfile,
  EMPTY_ANSWER_BANK,
  validateCandidateProfile,
  type ApplyFlowApplicationV2Envelope,
  type ApplyFlowJob,
} from "@devflow/applyflow-core";

import { persistDashboardJobs } from "./local-job-storage.js";
import { persistResumeLibrary } from "./local-resume-library-storage.js";
import { APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY } from "./local-analytics-storage.js";
import { persistApplicationWithOutcome } from "./persist-application-decision.js";
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

  it("aplica o backfill Closed Loop em memória sem persistir analytics", () => {
    stubStorage();
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
    const before = window.localStorage.getItem(APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY);
    const snapshot = loadJobDecisionV2Snapshot(jobA.id);
    expect(window.localStorage.getItem(APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY)).toBe(before);
    expect(
      snapshot.lifecycleEvents.some((item) => item.type === "applied" && item.source === "backfill"),
    ).toBe(true);
    expect(snapshot.application?.id).toBe("app-1");
  });

  it("I20C mostra a decisão do currículo selecionado e exige confirmação de idioma", () => {
    stubStorage();
    const profile = (language: "en" | "pt", skills: Record<string, number>) =>
      validateCandidateProfile({
        name: "Candidato Sintético",
        location: "Santos, SP, Brazil",
        englishLevel: "Advanced",
        roles: ["Senior Full Stack Engineer"],
        skills,
        facts: { location: "Santos, SP, Brazil", totalYearsExperience: 6, remotePreference: "remote", englishLevel: "Advanced" },
        answerBank: { ...EMPTY_ANSWER_BANK, tellUsAboutYourself: `${language === "en" ? "EN" : "PT"} intro: React and TypeScript.` },
      });
    const stack = { React: 6, Nextjs: 3, TypeScript: 5, Nodejs: 6 };
    const now = new Date("2026-10-27T15:00:00.000Z");
    const seeded = createResumeLibraryFromProfile(profile("pt", { ...stack, PostgreSQL: 3 }), {
      now,
      id: "rv_pt",
      name: "CV ATS PT-BR 2026",
    });
    const added = addResumeVariant(seeded, { profile: profile("en", stack), name: "CV ATS EN 2026", id: "rv_en", now });
    if (!added.ok) throw new Error(added.error);
    expect(persistResumeLibrary(added.library).ok).toBe(true);
    persistDashboardJobs([
      {
        ...jobA,
        descriptionSnapshot:
          "We are looking for a Senior Software Engineer. Remote - Brazil. PostgreSQL. React, Next.js, TypeScript and Node.js. Minimum 5 years.",
      },
    ]);

    const snapshot = loadJobDecisionV2Snapshot(jobA.id);
    expect(snapshot.pack?.status).toBe("needs_confirmation");
    expect(snapshot.pack?.evaluatedResumeVariantId).toBe("rv_pt");
    expect(snapshot.decision).toBe(snapshot.pack?.evaluation);
  });
});
