import { describe, expect, it } from "vitest";

import { gustavoProfile } from "../candidate-profile.js";
import { parseApplyFlowDashboardImportJsonString } from "../imported-dashboard-schema.js";
import { parseApplyFlowApplicationsImport } from "../imported-application-schema.js";
import { ingestApplyFlowJob } from "../ingest-applyflow-job.js";
import {
  parseApplyFlowJobsImport,
  parseApplyFlowJobsImportJsonString,
  parseStoredApplyFlowJob,
} from "../imported-job-schema.js";

const NOW = new Date("2026-08-13T12:00:00.000Z");
const profile = gustavoProfile;

const validApp = {
  id: "1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  status: "reviewing" as const,
  source: "linkedin" as const,
};

describe("parseApplyFlowJobsImport", () => {
  it("importa listings JSON e gera ApplyFlowJob", () => {
    const r = parseApplyFlowJobsImport(
      {
        version: 2,
        listings: [
          {
            title: "Product Engineer",
            description: "Remote CLT. React, Next.js, TypeScript and Node.js.",
            source: "json",
          },
        ],
      },
      { profile, now: NOW },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.jobs).toHaveLength(1);
    expect(r.jobs[0]?.source).toBe("json");
    expect(r.jobs[0]?.jobMatch.decision).toBe("apply");
    expect(r.jobs[0]?.status).toBe("reviewing");
  });

  it("preserva jobMatch v1 no roundtrip sem recalcular", () => {
    const stored = ingestApplyFlowJob({
      description: "React TypeScript Node.js Next.js",
      source: "paste",
      title: "Stored",
      profile,
      now: NOW,
      id: "job_stored",
    });
    stored.jobMatch = {
      ...stored.jobMatch,
      score: 81,
      decision: "apply",
    };
    const r = parseApplyFlowJobsImport({ version: 2, jobs: [stored] }, { profile, now: NOW });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.jobs[0]?.jobMatch.score).toBe(81);
    expect(r.jobs[0]?.jobMatch.scoringVersion).toBe("v1");
  });

  it("JSON inválido falha de forma segura", () => {
    const r = parseApplyFlowJobsImportJsonString("{", { profile, now: NOW });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/JSON/i);
    expect(r.jobs).toEqual([]);
  });

  it("rejeita jobs v2 sem registos válidos", () => {
    const r = parseApplyFlowJobsImport({ version: 2, jobs: [{ id: "x" }] }, { profile, now: NOW });
    expect(r.ok).toBe(false);
  });

  it("listings sem currículo válido falham fechado", () => {
    const r = parseApplyFlowJobsImport(
      { version: 2, listings: [{ description: "React TypeScript Next.js Node.js" }] },
      { now: NOW },
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/currículo/i);
  });
});

describe("parseStoredApplyFlowJob", () => {
  it("hidrata um ApplyFlowJob válido", () => {
    const stored = ingestApplyFlowJob({
      description: "React TypeScript Node.js Next.js",
      source: "paste",
      title: "Stored",
      profile,
      now: NOW,
      id: "job_valid",
    });
    expect(parseStoredApplyFlowJob(stored)?.id).toBe("job_valid");
  });

  it("isola um job sem jobMatch em vez de o tratar como válido", () => {
    expect(parseStoredApplyFlowJob({ id: "no-match", title: "Broken" })).toBeNull();
  });

  it("isola um job com applicationPack.checklist inválido", () => {
    const stored = ingestApplyFlowJob({
      description: "React TypeScript Node.js Next.js",
      source: "paste",
      title: "Packed",
      profile,
      now: NOW,
      id: "job_bad_pack",
    });
    expect(
      parseStoredApplyFlowJob({
        ...stored,
        applicationPack: {
          version: 1,
          packVersion: "application-pack-v1",
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
          jobId: stored.id,
          resume: { variantId: "rv_a", variantName: "A", recommendedByRouter: false },
          match: {
            score: 80,
            decision: "apply",
            matchedSkills: ["React"],
            missingSkills: [],
            scoringVersion: "v1",
          },
          highlights: [],
          gaps: [],
          candidateFacts: {},
          checklist: [{ id: "not-a-real-id", done: true }],
        },
      }),
    ).toBeNull();
  });
});

describe("parseApplyFlowDashboardImportJsonString", () => {
  it("mantém import v1 de candidaturas", () => {
    const r = parseApplyFlowDashboardImportJsonString(JSON.stringify({ version: 1, applications: [validApp] }), {
      profile,
      now: NOW,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.kind).toBe("applications");
    if (r.kind !== "applications") return;
    expect(r.result.applications).toHaveLength(1);
  });

  it("o parser v1 isolado continua a aceitar array directo", () => {
    const r = parseApplyFlowApplicationsImport([validApp]);
    expect(r.ok).toBe(true);
  });

  it("encaminha Career Bundle V2 sem tratar como jobs import", () => {
    const r = parseApplyFlowDashboardImportJsonString(
      JSON.stringify({
        version: 2,
        applications: [validApp],
        contacts: [],
        interactions: [],
        evidence: [],
        candidateInputs: [],
        futureNote: "keep",
      }),
      { profile, now: NOW },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.kind).toBe("career-bundle-v2");
    if (r.kind !== "career-bundle-v2") return;
    expect(r.bundle.applications[0]?.id).toBe("1");
    expect(r.bundle.extras?.futureNote).toBe("keep");
  });

  it("encaminha version 2 para jobs", () => {
    const r = parseApplyFlowDashboardImportJsonString(
      JSON.stringify({
        version: 2,
        listings: [{ description: "React TypeScript Next.js Node.js" }],
      }),
      { profile, now: NOW },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.kind).toBe("jobs");
  });
});
