import { afterEach, describe, expect, it, vi } from "vitest";

import { APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY } from "@/lib/local-analytics-storage";
import { APPLYFLOW_DASHBOARD_STORAGE_KEY } from "@/lib/local-import-storage";
import { APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY } from "@/lib/local-job-storage";
import type { ApplyFlowApplicationV2Envelope, ApplyFlowJob } from "@devflow/applyflow-core";

import { MIGRATION_MAX_JOBS } from "./migration-dto";
import { fingerprintMigrationBundle } from "./migration-fingerprint";
import {
  applicationToMigrationInput,
  deriveAppliedAtFromOutcomes,
  prepareMigrationBundle,
} from "./migration-prepare";

const job: ApplyFlowJob = {
  id: "job_b",
  title: "Role B",
  source: "paste",
  status: "reviewing",
  jobContext: { skills: ["Go"] },
  jobMatch: {
    score: 1,
    decision: "apply",
    matchedSkills: [],
    missingSkills: [],
    evaluatedAt: "2026-09-25T12:00:00.000Z",
    scoringVersion: "v1",
  },
  createdAt: "2026-09-25T12:00:00.000Z",
  updatedAt: "2026-09-25T12:00:00.000Z",
};

const jobA: ApplyFlowJob = {
  ...job,
  id: "job_a",
  title: "Role A",
};

const appLinked: ApplyFlowApplicationV2Envelope = {
  id: "app_linked",
  createdAt: "2026-09-25T12:00:00.000Z",
  updatedAt: "2026-09-25T12:00:00.000Z",
  source: "paste",
  status: "applied",
  jobTitle: "Role A",
  v2: { sourceJobId: "job_a" },
};

const appStandalone: ApplyFlowApplicationV2Envelope = {
  id: "app_standalone",
  createdAt: "2026-09-25T12:00:00.000Z",
  updatedAt: "2026-09-25T12:00:00.000Z",
  source: "json",
  status: "reviewing",
  jobTitle: "Standalone",
};

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

describe("migration prepare", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns empty bundle when there is no legacy data", () => {
    stubStorage();
    const prep = prepareMigrationBundle();
    expect(prep.ok).toBe(true);
    if (!prep.ok) return;
    expect(prep.empty).toBe(true);
    expect(prep.bundle.jobs).toEqual([]);
    expect(prep.bundle.applications).toEqual([]);
  });

  it("prepares jobs-only, apps-only, and both with stable ordering and fingerprint", () => {
    stubStorage({
      [APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]: JSON.stringify({
        version: 1,
        savedAt: "2026-09-25T12:00:00.000Z",
        jobs: [job, jobA],
      }),
    });
    const jobsOnly = prepareMigrationBundle();
    expect(jobsOnly.ok).toBe(true);
    if (!jobsOnly.ok) return;
    expect(jobsOnly.bundle.jobs.map((item) => item.id)).toEqual(["job_a", "job_b"]);

    stubStorage({
      [APPLYFLOW_DASHBOARD_STORAGE_KEY]: JSON.stringify({
        version: 1,
        importedAt: "2026-09-25T12:00:00.000Z",
        applications: [appStandalone, appLinked],
      }),
    });
    const appsOnly = prepareMigrationBundle();
    expect(appsOnly.ok).toBe(true);
    if (!appsOnly.ok) return;
    expect(appsOnly.bundle.applications.map((item) => item.id)).toEqual([
      "app_linked",
      "app_standalone",
    ]);
    expect(appsOnly.bundle.applications.find((item) => item.id === "app_linked")?.sourceJobId).toBe(
      "job_a",
    );

    stubStorage({
      [APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]: JSON.stringify({
        version: 1,
        savedAt: "volatile-should-not-matter",
        jobs: [job, jobA],
      }),
      [APPLYFLOW_DASHBOARD_STORAGE_KEY]: JSON.stringify({
        version: 1,
        importedAt: "also-volatile",
        applications: [appStandalone, appLinked],
      }),
    });
    const both = prepareMigrationBundle();
    expect(both.ok).toBe(true);
    if (!both.ok) return;
    expect(both.bundle.fingerprint).toBe(
      fingerprintMigrationBundle({
        jobs: both.bundle.jobs,
        applications: both.bundle.applications,
      }),
    );

    stubStorage({
      [APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]: JSON.stringify({
        version: 1,
        savedAt: "different-envelope-time",
        jobs: [jobA, job],
      }),
      [APPLYFLOW_DASHBOARD_STORAGE_KEY]: JSON.stringify({
        version: 1,
        importedAt: "different-import-time",
        applications: [appLinked, appStandalone],
      }),
    });
    const again = prepareMigrationBundle();
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.bundle.fingerprint).toBe(both.bundle.fingerprint);
  });

  it("derives appliedAt from Outcome and preserves sourceJobId", () => {
    expect(
      deriveAppliedAtFromOutcomes("app_1", [
        {
          applicationId: "app_1",
          createdAt: "t",
          updatedAt: "t",
          appliedAt: "2026-09-22T10:00:00.000Z",
        },
        {
          applicationId: "app_1",
          createdAt: "t",
          updatedAt: "t",
          appliedAt: "2026-09-20T10:00:00.000Z",
        },
      ]),
    ).toBe("2026-09-20T10:00:00.000Z");
    expect(deriveAppliedAtFromOutcomes("app_1", [])).toBeUndefined();

    stubStorage({
      [APPLYFLOW_DASHBOARD_STORAGE_KEY]: JSON.stringify({
        version: 1,
        importedAt: "2026-09-25T12:00:00.000Z",
        applications: [appLinked],
      }),
      [APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY]: JSON.stringify({
        version: 1,
        savedAt: "2026-09-25T12:00:00.000Z",
        outcomes: [
          {
            applicationId: "app_linked",
            createdAt: "2026-09-25T12:00:00.000Z",
            updatedAt: "2026-09-25T12:00:00.000Z",
            appliedAt: "2026-09-18T08:00:00.000Z",
          },
        ],
        events: [],
        efforts: [],
      }),
    });
    const prep = prepareMigrationBundle();
    expect(prep.ok).toBe(true);
    if (!prep.ok) return;
    expect(prep.bundle.applications[0]).toMatchObject({
      id: "app_linked",
      sourceJobId: "job_a",
      appliedAt: "2026-09-18T08:00:00.000Z",
    });
  });

  it("omits appliedAt for early statuses even when Outcome has one", () => {
    const reviewing: ApplyFlowApplicationV2Envelope = {
      ...appStandalone,
      status: "reviewing",
    };
    expect(applicationToMigrationInput(reviewing, "2026-09-18T08:00:00.000Z").appliedAt).toBeUndefined();
  });

  it("rejects duplicate ids, malformed envelopes, partial jobs, and oversized datasets", () => {
    stubStorage({
      [APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]: JSON.stringify({
        version: 1,
        savedAt: "t",
        jobs: [jobA, { ...jobA }],
      }),
    });
    expect(prepareMigrationBundle()).toMatchObject({ ok: false, code: "duplicate_id" });

    stubStorage({
      [APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]: "{not-json",
    });
    expect(prepareMigrationBundle()).toMatchObject({ ok: false, code: "legacy_unreadable" });

    stubStorage({
      [APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]: JSON.stringify({
        version: 1,
        savedAt: "t",
        jobs: [jobA, { id: "bad" }],
      }),
    });
    expect(prepareMigrationBundle()).toMatchObject({
      ok: false,
      code: "legacy_partial_or_malformed",
    });

    stubStorage({
      [APPLYFLOW_DASHBOARD_STORAGE_KEY]: JSON.stringify({
        version: 1,
        importedAt: "t",
        applications: [appLinked, { ...appLinked }],
      }),
    });
    expect(prepareMigrationBundle()).toMatchObject({ ok: false, code: "duplicate_id" });

    const tooMany = Array.from({ length: MIGRATION_MAX_JOBS + 1 }, (_, index) => ({
      ...jobA,
      id: `job_${String(index).padStart(3, "0")}`,
    }));
    stubStorage({
      [APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]: JSON.stringify({
        version: 1,
        savedAt: "t",
        jobs: tooMany,
      }),
    });
    expect(prepareMigrationBundle()).toMatchObject({
      ok: false,
      code: "migration_dataset_too_large",
    });
  });
});
