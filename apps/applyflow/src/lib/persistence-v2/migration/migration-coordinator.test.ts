import { afterEach, describe, expect, it, vi } from "vitest";

import { APPLYFLOW_DASHBOARD_STORAGE_KEY } from "@/lib/local-import-storage";
import { APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY } from "@/lib/local-job-storage";
import type { ApplyFlowApplicationV2Envelope, ApplyFlowJob } from "@devflow/applyflow-core";

import {
  resumeMigration,
  runMigration,
  validateMigrationCompletionProof,
} from "./migration-coordinator";
import { APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY, loadMigrationMarker } from "./migration-marker";
import { prepareMigrationBundle } from "./migration-prepare";

const ACCOUNT = "acc-coord-1";

const job: ApplyFlowJob = {
  id: "job_coord",
  title: "Coordinator Role",
  source: "paste",
  status: "reviewing",
  jobContext: { skills: ["React"] },
  jobMatch: {
    score: 80,
    decision: "apply",
    matchedSkills: ["React"],
    missingSkills: [],
    evaluatedAt: "2026-09-25T12:00:00.000Z",
    scoringVersion: "v1",
  },
  createdAt: "2026-09-25T12:00:00.000Z",
  updatedAt: "2026-09-25T12:00:00.000Z",
};

const application: ApplyFlowApplicationV2Envelope = {
  id: "app_coord",
  createdAt: "2026-09-25T12:00:00.000Z",
  updatedAt: "2026-09-25T12:00:00.000Z",
  source: "paste",
  status: "reviewing",
  jobTitle: "Coordinator Role",
  v2: { sourceJobId: "job_coord" },
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

function seedLegacy(storage: Record<string, string>) {
  storage[APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY] = JSON.stringify({
    version: 1,
    savedAt: "2026-09-25T12:00:00.000Z",
    jobs: [job],
  });
  storage[APPLYFLOW_DASHBOARD_STORAGE_KEY] = JSON.stringify({
    version: 1,
    importedAt: "2026-09-25T12:00:00.000Z",
    applications: [application],
  });
}

function proofFor(bundle: ReturnType<typeof prepareMigrationBundle> & { ok: true }) {
  return {
    sessionId: "session_coord_1",
    status: "completed" as const,
    fingerprint: bundle.bundle.fingerprint,
    sourceVersion: 1 as const,
    expectedJobs: bundle.bundle.jobs.length,
    expectedApplications: bundle.bundle.applications.length,
    processedJobs: bundle.bundle.jobs.length,
    processedApplications: bundle.bundle.applications.length,
    completedAt: "2026-09-25T21:00:00.000Z",
  };
}

describe("migration coordinator", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("writes marker only after valid completion proof and retains V1 data", async () => {
    const storage = stubStorage();
    seedLegacy(storage);
    const prep = prepareMigrationBundle();
    expect(prep.ok).toBe(true);
    if (!prep.ok) return;
    const proof = proofFor(prep);
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/me")) {
        return new Response(JSON.stringify({ authenticated: true, account: { id: ACCOUNT } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.endsWith("/migration")) {
        return new Response(JSON.stringify(proof), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "unexpected" }), { status: 500 });
    });

    const result = await runMigration({ fetchImpl });
    expect(result.ok).toBe(true);
    if (!result.ok || !("marker" in result)) return;
    expect(result.state).toBe("completed");
    expect(loadMigrationMarker(ACCOUNT)?.sessionId).toBe("session_coord_1");
    expect(storage[APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]).toContain("job_coord");
    expect(storage[APPLYFLOW_DASHBOARD_STORAGE_KEY]).toContain("app_coord");
    expect(storage[APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY]).toContain(prep.bundle.fingerprint);
  });

  it("does not write marker on auth failure, API failure, conflict, or invalid proof", async () => {
    const storage = stubStorage();
    seedLegacy(storage);
    const prep = prepareMigrationBundle();
    expect(prep.ok).toBe(true);
    if (!prep.ok) return;

    const unauth = await runMigration({
      fetchImpl: vi.fn(async () => new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401 })),
    });
    expect(unauth).toMatchObject({ ok: false, code: "auth_required" });
    expect(storage[APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY]).toBeUndefined();

    const conflict = await runMigration({
      accountId: ACCOUNT,
      fetchImpl: vi.fn(async () =>
        new Response(
          JSON.stringify({
            error: "migration_conflict",
            conflicts: [{ entityType: "job", entityId: "job_coord", reason: "same_id_different_content" }],
          }),
          { status: 409, headers: { "content-type": "application/json" } },
        ),
      ),
    });
    expect(conflict).toMatchObject({ ok: false, code: "migration_conflict" });
    expect(storage[APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY]).toBeUndefined();

    const badProof = await runMigration({
      accountId: ACCOUNT,
      fetchImpl: vi.fn(async () =>
        new Response(
          JSON.stringify({ ...proofFor(prep), fingerprint: "deadbeef" }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    });
    expect(badProof).toMatchObject({ ok: false, code: "completion_proof_invalid" });
    expect(storage[APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY]).toBeUndefined();

    const apiFail = await runMigration({
      accountId: ACCOUNT,
      fetchImpl: vi.fn(async () =>
        new Response(JSON.stringify({ error: "internal_error" }), { status: 500 }),
      ),
    });
    expect(apiFail).toMatchObject({ ok: false, code: "migration_api_failed" });
    expect(storage[APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY]).toBeUndefined();
  });

  it("recovers after lost response / marker-write failure via resume of the same bundle", async () => {
    const storage = stubStorage();
    seedLegacy(storage);
    const prep = prepareMigrationBundle();
    expect(prep.ok).toBe(true);
    if (!prep.ok) return;
    const proof = proofFor(prep);

    // Crash window B/C: server completed, browser lost response — retry succeeds
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify(proof), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const resumed = await resumeMigration({ accountId: ACCOUNT, fetchImpl });
    expect(resumed.ok).toBe(true);
    expect(loadMigrationMarker(ACCOUNT)?.fingerprint).toBe(prep.bundle.fingerprint);

    // Idempotent second resume with existing marker — no POST required
    const fetchAgain = vi.fn();
    const again = await resumeMigration({ accountId: ACCOUNT, fetchImpl: fetchAgain });
    expect(again.ok).toBe(true);
    expect(fetchAgain).not.toHaveBeenCalled();
  });

  it("reports marker_write_failed when storage setItem throws after proof", async () => {
    const storage: Record<string, string> = {};
    seedLegacy(storage);
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => (key in storage ? storage[key]! : null),
        setItem: (key: string, value: string) => {
          if (key === APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY) {
            throw new Error("quota");
          }
          storage[key] = value;
        },
        removeItem: (key: string) => {
          delete storage[key];
        },
      },
    });
    const prep = prepareMigrationBundle();
    expect(prep.ok).toBe(true);
    if (!prep.ok) return;
    const result = await runMigration({
      accountId: ACCOUNT,
      fetchImpl: vi.fn(async () =>
        new Response(JSON.stringify(proofFor(prep)), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    });
    expect(result).toMatchObject({ ok: false, code: "marker_write_failed" });
    expect(storage[APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]).toContain("job_coord");
  });

  it("validates completion proof fields strictly", () => {
    const storage = stubStorage();
    seedLegacy(storage);
    const prep = prepareMigrationBundle();
    expect(prep.ok).toBe(true);
    if (!prep.ok) return;
    const valid = proofFor(prep);
    expect(validateMigrationCompletionProof(valid, prep.bundle)).toEqual(valid);
    expect(
      validateMigrationCompletionProof({ ...valid, expectedJobs: 99 }, prep.bundle),
    ).toBeNull();
    expect(
      validateMigrationCompletionProof({ ...valid, status: "failed" }, prep.bundle),
    ).toBeNull();
  });
});
