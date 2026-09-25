import { afterEach, describe, expect, it, vi } from "vitest";

import { APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY } from "@/lib/local-job-storage";
import { APPLYFLOW_DASHBOARD_STORAGE_KEY } from "@/lib/local-import-storage";
import type { ApplyFlowApplicationV2Envelope, ApplyFlowJob } from "@devflow/applyflow-core";

import { fingerprintApplyFlowAccountId } from "../migration/migration-fingerprint";
import {
  APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY,
  type MigrationMarkerRecord,
} from "../migration/migration-marker";
import {
  assessDashboardMigrationGate,
  selectDashboardPersistenceMode,
} from "./dashboard-persistence";
import { openDashboardPersistence } from "./open-dashboard-persistence";
import { createV1DashboardPersistence } from "./v1-local-dashboard-persistence";
import { createV2DashboardPersistence } from "./v2-remote-dashboard-persistence";

const ACCOUNT_ID = "acc-gate-1";
const OTHER_ACCOUNT_ID = "acc-gate-other";

function completedMarker(accountId = ACCOUNT_ID): MigrationMarkerRecord {
  return {
    version: 1,
    v1ToV2Complete: true,
    accountIdFingerprint: fingerprintApplyFlowAccountId(accountId),
    sessionId: "session_gate_1",
    completedAt: "2026-09-25T20:00:00.000Z",
    fingerprint: "aabbccdd",
  };
}

function meResponse(accountId = ACCOUNT_ID) {
  return jsonResponse(200, { authenticated: true, account: { id: accountId } });
}

function emptyV2Lists(fetchImpl: ReturnType<typeof vi.fn>) {
  fetchImpl.mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/me")) return meResponse();
    if (url.endsWith("/jobs")) return jsonResponse(200, { jobs: [] });
    if (url.endsWith("/applications")) return jsonResponse(200, { applications: [] });
    return jsonResponse(500, { error: "unexpected" });
  });
}

const job: ApplyFlowJob = {
  id: "job_client_fixed",
  title: "Product Engineer",
  source: "paste",
  status: "reviewing",
  url: "https://jobs.example.com/acme/role",
  jobContext: { skills: ["React"] },
  descriptionSnapshot: "React TypeScript",
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
  id: "app_client",
  createdAt: "2026-09-25T12:00:00.000Z",
  updatedAt: "2026-09-25T12:00:00.000Z",
  source: "paste",
  status: "reviewing",
  jobTitle: "Product Engineer",
  v2: { sourceJobId: job.id },
};

function jobResponse(version: number, overrides: Record<string, unknown> = {}) {
  return {
    ...job,
    company: null,
    location: null,
    canonicalUrl: job.url,
    descriptionHash: "abcd1234",
    evaluatedWith: null,
    curriculumRecommendation: null,
    applicationPack: null,
    version,
    ...overrides,
  };
}

function applicationResponse(version: number, status = "reviewing") {
  return {
    id: application.id,
    sourceJobId: job.id,
    source: "paste",
    status,
    jobTitle: "Product Engineer",
    companyName: null,
    jobUrl: null,
    fitScore: null,
    notes: null,
    jobMeta: null,
    v2Meta: null,
    extras: null,
    appliedAt: status === "applied" ? "2026-09-25T15:00:00.000Z" : null,
    version,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  };
}

function jsonResponse(status: number, body: unknown, etag?: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...(etag ? { etag } : {}),
    },
  });
}

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

describe("dashboard persistence mode", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps V1 when the server flag is off and does not call the V2 API", async () => {
    const fetchImpl = vi.fn();
    stubStorage();
    expect(selectDashboardPersistenceMode(false)).toBe("v1");
    const opened = await openDashboardPersistence({ persistenceV2Enabled: false, fetchImpl });
    expect(opened.kind).toBe("v1");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("selects V2 when the server flag is on and the browser has no legacy data", async () => {
    stubStorage();
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/jobs")) return jsonResponse(200, { jobs: [] });
      return jsonResponse(200, { applications: [] });
    });
    const opened = await openDashboardPersistence({ persistenceV2Enabled: true, fetchImpl });
    expect(opened.kind).toBe("ready");
    expect(fetchImpl).toHaveBeenCalled();
  });

  it("requires authentication when V2 list returns 401", async () => {
    stubStorage();
    const fetchImpl = vi.fn(async () => jsonResponse(401, { error: "unauthenticated" }));
    const opened = await openDashboardPersistence({ persistenceV2Enabled: true, fetchImpl });
    expect(opened).toMatchObject({ kind: "auth_required", code: "unauthenticated" });
  });

  it("blocks V2 when legacy data exists and migration is not proven", async () => {
    const storage = stubStorage({
      [APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]: JSON.stringify({
        version: 1,
        savedAt: "2026-09-25T12:00:00.000Z",
        jobs: [job],
      }),
    });
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/me")) return meResponse();
      return jsonResponse(500, { error: "unexpected" });
    });
    expect(
      assessDashboardMigrationGate({
        mode: "v2",
        legacyData: true,
        migration: { v1ToV2Complete: false },
      }),
    ).toBe("migration_required");
    const opened = await openDashboardPersistence({ persistenceV2Enabled: true, fetchImpl });
    expect(opened.kind).toBe("migration_required");
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/applyflow/v2/me",
      expect.objectContaining({ method: "GET" }),
    );
    expect(storage[APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]).toContain("job_client_fixed");
  });

  it("requires auth before migration when legacy exists and /me is unauthenticated", async () => {
    stubStorage({
      [APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]: JSON.stringify({
        version: 1,
        savedAt: "2026-09-25T12:00:00.000Z",
        jobs: [job],
      }),
    });
    const fetchImpl = vi.fn(async () => jsonResponse(401, { error: "unauthenticated" }));
    const opened = await openDashboardPersistence({ persistenceV2Enabled: true, fetchImpl });
    expect(opened).toMatchObject({ kind: "auth_required", code: "unauthenticated" });
  });

  it("keeps V1 on flag off even with legacy jobs present", async () => {
    stubStorage({
      [APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]: JSON.stringify({
        version: 1,
        savedAt: "2026-09-25T12:00:00.000Z",
        jobs: [job],
      }),
    });
    const fetchImpl = vi.fn();
    const opened = await openDashboardPersistence({ persistenceV2Enabled: false, fetchImpl });
    expect(opened.kind).toBe("v1");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("requires migration for jobs-only, apps-only, both, and partial legacy", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/me")) return meResponse();
      return jsonResponse(500, { error: "unexpected" });
    });

    stubStorage({
      [APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]: JSON.stringify({
        version: 1,
        savedAt: "2026-09-25T12:00:00.000Z",
        jobs: [job],
      }),
    });
    expect((await openDashboardPersistence({ persistenceV2Enabled: true, fetchImpl })).kind).toBe(
      "migration_required",
    );

    stubStorage({
      [APPLYFLOW_DASHBOARD_STORAGE_KEY]: JSON.stringify({
        version: 1,
        importedAt: "2026-09-25T12:00:00.000Z",
        applications: [application],
      }),
    });
    expect((await openDashboardPersistence({ persistenceV2Enabled: true, fetchImpl })).kind).toBe(
      "migration_required",
    );

    stubStorage({
      [APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]: JSON.stringify({
        version: 1,
        savedAt: "2026-09-25T12:00:00.000Z",
        jobs: [job],
      }),
      [APPLYFLOW_DASHBOARD_STORAGE_KEY]: JSON.stringify({
        version: 1,
        importedAt: "2026-09-25T12:00:00.000Z",
        applications: [application],
      }),
    });
    expect((await openDashboardPersistence({ persistenceV2Enabled: true, fetchImpl })).kind).toBe(
      "migration_required",
    );

    stubStorage({
      [APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]: "{not-json",
    });
    expect((await openDashboardPersistence({ persistenceV2Enabled: true, fetchImpl })).kind).toBe(
      "migration_required",
    );
  });

  it("rejects incomplete, malformed, and other-account markers", async () => {
    const legacyJobs = JSON.stringify({
      version: 1,
      savedAt: "2026-09-25T12:00:00.000Z",
      jobs: [job],
    });
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/me")) return meResponse();
      return jsonResponse(500, { error: "unexpected" });
    });

    stubStorage({
      [APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]: legacyJobs,
      [APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY]: JSON.stringify({
        ...completedMarker(),
        v1ToV2Complete: false,
      }),
    });
    expect((await openDashboardPersistence({ persistenceV2Enabled: true, fetchImpl })).kind).toBe(
      "migration_required",
    );

    stubStorage({
      [APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]: legacyJobs,
      [APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY]: "{broken",
    });
    expect((await openDashboardPersistence({ persistenceV2Enabled: true, fetchImpl })).kind).toBe(
      "migration_required",
    );

    stubStorage({
      [APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]: legacyJobs,
      [APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY]: JSON.stringify(completedMarker(OTHER_ACCOUNT_ID)),
    });
    expect((await openDashboardPersistence({ persistenceV2Enabled: true, fetchImpl })).kind).toBe(
      "migration_required",
    );
  });

  it("unlocks V2 with a valid same-account marker without rewriting V1 data", async () => {
    const legacyJobs = JSON.stringify({
      version: 1,
      savedAt: "2026-09-25T12:00:00.000Z",
      jobs: [job],
    });
    const legacyApps = JSON.stringify({
      version: 1,
      importedAt: "2026-09-25T12:00:00.000Z",
      applications: [application],
    });
    const storage = stubStorage({
      [APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]: legacyJobs,
      [APPLYFLOW_DASHBOARD_STORAGE_KEY]: legacyApps,
      [APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY]: JSON.stringify(completedMarker()),
    });
    const fetchImpl = vi.fn();
    emptyV2Lists(fetchImpl);
    const opened = await openDashboardPersistence({ persistenceV2Enabled: true, fetchImpl });
    expect(opened.kind).toBe("ready");
    expect(storage[APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]).toBe(legacyJobs);
    expect(storage[APPLYFLOW_DASHBOARD_STORAGE_KEY]).toBe(legacyApps);
    expect(storage[APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY]).toContain("session_gate_1");
  });
});

describe("V1 dashboard persistence", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the current storage keys, ids, and envelopes", async () => {
    const storage = stubStorage();
    const persistence = createV1DashboardPersistence();
    const created = await persistence.createJob(job);
    expect(created.ok).toBe(true);
    const savedJobs = JSON.parse(storage[APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]!) as { version: number; jobs: { id: string }[] };
    expect(savedJobs.version).toBe(1);
    expect(savedJobs.jobs[0]?.id).toBe(job.id);

    const updated = await persistence.updateJob({ ...job, title: "Staff Engineer" });
    expect(updated.ok).toBe(true);
    if (updated.ok) expect(updated.data.title).toBe("Staff Engineer");

    const app = await persistence.createApplication(application);
    expect(app.ok).toBe(true);
    const savedApps = JSON.parse(storage[APPLYFLOW_DASHBOARD_STORAGE_KEY]!) as {
      version: number;
      applications: { id: string; status: string }[];
    };
    expect(savedApps.version).toBe(1);
    expect(savedApps.applications[0]?.id).toBe(application.id);
    const changed = await persistence.updateApplication({ ...application, status: "applied" });
    expect(changed.ok).toBe(true);
    if (changed.ok) expect(changed.data.status).toBe("applied");
    expect(storage[APPLYFLOW_DASHBOARD_STORAGE_KEY]).toContain("\"applied\"");
  });
});

describe("V2 dashboard persistence", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists, creates, and patches jobs and applications without writing localStorage", async () => {
    const writes: string[] = [];
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => null,
        setItem: (key: string) => {
          writes.push(key);
        },
        removeItem: () => undefined,
      },
    });
    let jobVersion = 1;
    const applicationVersion = 1;
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.endsWith("/jobs") && method === "GET") return jsonResponse(200, { jobs: [jobResponse(jobVersion)] });
      if (url.endsWith("/jobs") && method === "POST") return jsonResponse(201, jobResponse(1), "\"1\"");
      if (url.includes("/jobs/") && method === "PATCH") {
        expect(init?.headers).toMatchObject({ "if-match": "\"1\"" });
        jobVersion = 2;
        return jsonResponse(200, jobResponse(2, { title: "Staff Engineer" }), "\"2\"");
      }
      if (url.endsWith("/applications") && method === "GET") {
        return jsonResponse(200, { applications: [applicationResponse(applicationVersion)] });
      }
      if (url.endsWith("/applications") && method === "POST") {
        return jsonResponse(201, applicationResponse(1), "\"1\"");
      }
      if (url.includes("/applications/") && method === "PATCH") {
        expect(init?.headers).toMatchObject({ "if-match": "\"1\"" });
        return jsonResponse(200, applicationResponse(2, "applied"), "\"2\"");
      }
      return jsonResponse(500, { error: "internal_error" });
    });

    const persistence = createV2DashboardPersistence(fetchImpl);
    const jobs = await persistence.listJobs();
    expect(jobs[0]?.id).toBe(job.id);
    expect(jobs[0]).not.toHaveProperty("version");
    const createdJob = await persistence.createJob(job);
    expect(createdJob.ok).toBe(true);
    const patchedJob = await persistence.updateJob({ ...job, title: "Staff Engineer" });
    expect(patchedJob.ok).toBe(true);
    if (patchedJob.ok) expect(patchedJob.data.title).toBe("Staff Engineer");

    const applications = await persistence.listApplications();
    expect(applications[0]?.v2?.sourceJobId).toBe(job.id);
    const createdApp = await persistence.createApplication(application);
    expect(createdApp.ok).toBe(true);
    const patchedApp = await persistence.updateApplication({ ...application, status: "applied" });
    expect(patchedApp.ok).toBe(true);
    if (patchedApp.ok) {
      expect(patchedApp.data.status).toBe("applied");
      expect(patchedApp.data.v2?.sourceJobId).toBe(job.id);
    }
    expect(writes).toEqual([]);
  });

  it("returns typed conflicts and does not replace state on 409", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.endsWith("/jobs") && method === "GET") return jsonResponse(200, { jobs: [jobResponse(2)] });
      if (url.includes("/jobs/") && method === "PATCH") return jsonResponse(409, { error: "version_conflict" });
      if (url.endsWith("/applications") && method === "POST") {
        return jsonResponse(409, { error: "application_already_exists_for_job" });
      }
      if (url.endsWith("/applications") && method === "GET") return jsonResponse(200, { applications: [] });
      return jsonResponse(500, { error: "internal_error" });
    });
    const persistence = createV2DashboardPersistence(fetchImpl);
    await persistence.listJobs();
    const conflict = await persistence.updateJob(job);
    expect(conflict).toEqual({ ok: false, code: "version_conflict" });
    const duplicate = await persistence.createApplication(application);
    expect(duplicate).toEqual({ ok: false, code: "application_already_exists_for_job" });
  });
});
