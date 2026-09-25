import type { ApplyFlowApplicationV2Envelope, ApplyFlowJob, ApplicationOutcome } from "@devflow/applyflow-core";

import { persistDashboardAnalytics } from "@/lib/local-analytics-storage";
import { persistDashboardImport } from "@/lib/local-import-storage";
import { persistDashboardJobs } from "@/lib/local-job-storage";

import type { ApplyFlowPersistenceDb } from "../repositories/types";

/** Deterministic, identifiable F3.5 E2E ids — surgical cleanup only. */
export const F35_JOB_1 = "e2e_f35_job_1";
export const F35_JOB_2 = "e2e_f35_job_2";
export const F35_APP_LINKED = "e2e_f35_app_linked";
export const F35_APP_STANDALONE = "e2e_f35_app_standalone";
export const F35_APPLIED_AT = "2026-09-20T15:30:00.000Z";
export const F35_CONFLICT_JOB = "e2e_f35_conflict_job";

export function buildF35Jobs(): ApplyFlowJob[] {
  const baseMatch: ApplyFlowJob["jobMatch"] = {
    score: 82,
    decision: "apply",
    matchedSkills: ["TypeScript"],
    missingSkills: [],
    evaluatedAt: "2026-09-20T12:00:00.000Z",
    scoringVersion: "v1",
  };
  return [
    {
      id: F35_JOB_1,
      title: "E2E Persistence Engineer",
      company: "DevFlow Labs E2E",
      location: "Remote",
      url: "https://example.test/jobs/e2e-f35-1",
      source: "paste",
      status: "reviewing",
      jobContext: { skills: ["TypeScript", "Prisma"] },
      jobMatch: baseMatch,
      createdAt: "2026-09-20T12:00:00.000Z",
      updatedAt: "2026-09-20T12:00:00.000Z",
    },
    {
      id: F35_JOB_2,
      title: "E2E Platform Analyst",
      company: "DevFlow Labs E2E",
      source: "paste",
      status: "reviewing",
      jobContext: { skills: ["SQL"] },
      jobMatch: { ...baseMatch, score: 70 },
      createdAt: "2026-09-20T12:05:00.000Z",
      updatedAt: "2026-09-20T12:05:00.000Z",
    },
  ];
}

export function buildF35Applications(): ApplyFlowApplicationV2Envelope[] {
  return [
    {
      id: F35_APP_LINKED,
      createdAt: "2026-09-20T13:00:00.000Z",
      updatedAt: "2026-09-20T14:00:00.000Z",
      source: "paste",
      status: "applied",
      jobTitle: "E2E Persistence Engineer",
      companyName: "DevFlow Labs E2E",
      jobUrl: "https://example.test/jobs/e2e-f35-1",
      fieldsDetected: 4,
      fieldsFilled: 3,
      jobMeta: { seniority: "mid" },
      v2: {
        sourceJobId: F35_JOB_1,
        decision: "apply_normal",
        priority: 2,
        hiringProbability: "medium",
      },
    },
    {
      id: F35_APP_STANDALONE,
      createdAt: "2026-09-20T13:10:00.000Z",
      updatedAt: "2026-09-20T13:10:00.000Z",
      source: "paste",
      status: "reviewing",
      jobTitle: "Standalone E2E Role",
      companyName: "Independent Co",
    },
  ];
}

export function buildF35Outcomes(): ApplicationOutcome[] {
  return [
    {
      applicationId: F35_APP_LINKED,
      createdAt: "2026-09-20T14:00:00.000Z",
      updatedAt: "2026-09-20T14:00:00.000Z",
      appliedAt: F35_APPLIED_AT,
    },
  ];
}

/** Seed controlled browser-local V1 dataset for F3.5. */
export function seedF35BrowserV1Fixture(): {
  jobsRaw: string | null;
  appsRaw: string | null;
  analyticsRaw: string | null;
} {
  persistDashboardJobs(buildF35Jobs());
  persistDashboardImport(buildF35Applications());
  persistDashboardAnalytics(buildF35Outcomes(), [], []);
  return {
    jobsRaw: window.localStorage.getItem("APPLYFLOW_DASHBOARD_JOBS_V1"),
    appsRaw: window.localStorage.getItem("APPLYFLOW_DASHBOARD_IMPORT_V1"),
    analyticsRaw: window.localStorage.getItem("APPLYFLOW_DASHBOARD_ANALYTICS_V1"),
  };
}

/**
 * Remove ONLY F3.5 deterministic fixtures for an account.
 * Never deletes ApplyFlowAccount or auth.users.
 * Sessions are removed only when fingerprints are explicitly provided.
 */
export async function cleanupAllF35ForAccount(
  db: ApplyFlowPersistenceDb,
  accountId: string,
  fingerprints: string[] = [],
): Promise<void> {
  await db.applyFlowApplication.deleteMany({
    where: { accountId, id: { startsWith: "e2e_f35_" } },
  });
  await db.applyFlowJob.deleteMany({
    where: { accountId, id: { startsWith: "e2e_f35_" } },
  });
  if (fingerprints.length > 0) {
    await db.applyFlowMigrationSession.deleteMany({
      where: { accountId, bundleFingerprint: { in: fingerprints } },
    });
  }
}
