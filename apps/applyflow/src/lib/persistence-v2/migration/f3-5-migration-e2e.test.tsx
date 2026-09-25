// @vitest-environment jsdom
/**
 * F3.5 end-to-end + recovery validation against dedicated DEV Supabase.
 *
 * Opt-in: APPLYFLOW_F3_5_E2E=1
 * Mutates only e2e_f35_* fixtures; never deletes ApplyFlowAccount / auth.users.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { DashboardMigrationPanel } from "@/components/dashboard/dashboard-migration-panel";
import { APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY } from "@/lib/local-analytics-storage";
import { APPLYFLOW_DASHBOARD_STORAGE_KEY } from "@/lib/local-import-storage";
import {
  APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY,
  persistDashboardJobs,
} from "@/lib/local-job-storage";
import { openDashboardPersistence } from "@/lib/persistence-v2/dashboard/open-dashboard-persistence";
import { selectDashboardPersistenceMode } from "@/lib/persistence-v2/dashboard/dashboard-persistence";
import { applyFlowApplicationService } from "@/lib/persistence-v2/applications/application-service";
import { applyflowPrisma } from "@/lib/persistence-v2/db";
import { applyFlowJobService } from "@/lib/persistence-v2/jobs/job-service";

import { assertApplyFlowDedicatedDevEnvironment } from "./f3-5-dev-environment";
import {
  F35_APP_LINKED,
  F35_APP_STANDALONE,
  F35_APPLIED_AT,
  F35_CONFLICT_JOB,
  F35_JOB_1,
  F35_JOB_2,
  buildF35Jobs,
  cleanupAllF35ForAccount,
  seedF35BrowserV1Fixture,
} from "./f3-5-e2e-fixture";
import {
  prepareMigration,
  resumeMigration,
  runMigration,
} from "./migration-coordinator";
import { APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY, loadMigrationMarker } from "./migration-marker";
import * as migrationMarker from "./migration-marker";
import { prepareMigrationBundle } from "./migration-prepare";

const RUN = process.env.APPLYFLOW_F3_5_E2E === "1";

vi.mock("@/lib/persistence-v2/feature-flag", () => ({
  isApplyFlowPersistenceV2Enabled: vi.fn(() => true),
}));

vi.mock("@/lib/persistence-v2/require-applyflow-account", async () => {
  const actual = await vi.importActual<typeof import("../require-applyflow-account")>(
    "../require-applyflow-account",
  );
  return {
    ...actual,
    requireApplyFlowAccount: vi.fn(),
  };
});

import { isApplyFlowPersistenceV2Enabled } from "@/lib/persistence-v2/feature-flag";
import {
  ApplyFlowAuthError,
  requireApplyFlowAccount,
} from "@/lib/persistence-v2/require-applyflow-account";
import { POST as migrationPost } from "@/app/api/applyflow/v2/migration/route";

describe.skipIf(!RUN)(
  "F3.5 persistence v2 migration E2E (dedicated DEV)",
  () => {
  const fingerprints = new Set<string>();
  let accountId = "";
  let accountRecord: {
    id: string;
    authProviderSub: string;
    email: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null = null;

  beforeAll(async () => {
    const env = assertApplyFlowDedicatedDevEnvironment();
    expect(env.ok, JSON.stringify(env)).toBe(true);
    expect(env.supabaseHost).toBe("qygwhuwvilkekfkgoizb.supabase.co");
    expect(env.dbHost).toBe("aws-0-sa-east-1.pooler.supabase.com");

    const account = await applyflowPrisma.applyFlowAccount.findFirst({
      select: { id: true, authProviderSub: true, email: true, createdAt: true, updatedAt: true },
    });
    expect(account).toBeTruthy();
    accountId = account!.id;
    accountRecord = account!;
    vi.mocked(requireApplyFlowAccount).mockResolvedValue(accountRecord);
    vi.mocked(isApplyFlowPersistenceV2Enabled).mockReturnValue(true);

    const prep = prepareMigrationBundle();
    if (prep.ok && !prep.empty) fingerprints.add(prep.bundle.fingerprint);
    await cleanupAllF35ForAccount(applyflowPrisma, accountId, [...fingerprints]);
    fingerprints.clear();
  });

  beforeEach(async () => {
    window.localStorage.clear();
    if (accountId) {
      await cleanupAllF35ForAccount(applyflowPrisma, accountId, [...fingerprints]);
    }
    vi.mocked(requireApplyFlowAccount).mockReset();
    vi.mocked(requireApplyFlowAccount).mockResolvedValue(accountRecord!);
    vi.mocked(isApplyFlowPersistenceV2Enabled).mockReset();
    vi.mocked(isApplyFlowPersistenceV2Enabled).mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.mocked(requireApplyFlowAccount).mockReset();
    vi.mocked(requireApplyFlowAccount).mockResolvedValue(accountRecord!);
    vi.mocked(isApplyFlowPersistenceV2Enabled).mockReset();
    vi.mocked(isApplyFlowPersistenceV2Enabled).mockReturnValue(true);
  });

  afterAll(async () => {
    if (!accountId) return;
    await cleanupAllF35ForAccount(applyflowPrisma, accountId, [...fingerprints]);
    await applyflowPrisma.$disconnect();
  });

  function trackFingerprint(): string {
    const prep = prepareMigrationBundle();
    expect(prep.ok).toBe(true);
    if (!prep.ok) throw new Error("prepare failed");
    fingerprints.add(prep.bundle.fingerprint);
    return prep.bundle.fingerprint;
  }

  function createFetchImpl(options?: { unauthenticated?: boolean }) {
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = String(input);
      if (url.endsWith("/me") || url.includes("/api/applyflow/v2/me")) {
        if (options?.unauthenticated) {
          return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401 });
        }
        return new Response(
          JSON.stringify({ authenticated: true, account: { id: accountId } }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.includes("/api/applyflow/v2/migration") && (init?.method ?? "GET") === "POST") {
        const request = new Request("http://localhost/api/applyflow/v2/migration", {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: init?.body ?? null,
        });
        const response = await migrationPost(request);
        const text = await response.text();
        return new Response(text, {
          status: response.status,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.endsWith("/jobs") || url.includes("/api/applyflow/v2/jobs")) {
        const jobs = (await applyFlowJobService.list(accountId)).filter((job) =>
          job.id.startsWith("e2e_f35_"),
        );
        return new Response(JSON.stringify({ jobs }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.endsWith("/applications") || url.includes("/api/applyflow/v2/applications")) {
        const applications = (await applyFlowApplicationService.list(accountId)).filter((app) =>
          app.id.startsWith("e2e_f35_"),
        );
        return new Response(JSON.stringify({ applications }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "unexpected" }), { status: 500 });
    };
  }

  it("pre-migration: migration_required, panel counts, no auto-start", async () => {
    const snap = seedF35BrowserV1Fixture();
    expect(snap.jobsRaw).toBeTruthy();
    expect(snap.appsRaw).toBeTruthy();
    expect(window.localStorage.getItem(APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY)).toBeTruthy();
    expect(window.localStorage.getItem(APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY)).toBeNull();

    const opened = await openDashboardPersistence({
      persistenceV2Enabled: true,
      fetchImpl: createFetchImpl(),
      accountId,
    });
    expect(opened.kind).toBe("migration_required");

    const prep = prepareMigration();
    expect(prep.ok).toBe(true);
    if (!prep.ok) return;
    expect(prep.bundle.jobs).toHaveLength(2);
    expect(prep.bundle.applications).toHaveLength(2);

    const onComplete = vi.fn();
    render(<DashboardMigrationPanel onComplete={onComplete} fetchImpl={createFetchImpl()} />);
    expect(await screen.findByText("Migrar dados para a conta")).toBeTruthy();
    expect(screen.getByText(/Vagas detectadas:/)).toBeTruthy();
    expect(screen.getByText(/Candidaturas detectadas:/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Migrar dados para V2" })).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();
    expect(loadMigrationMarker(accountId)).toBeNull();
  });

  it("happy path: UI → coordinator → POST route → Prisma → marker → v2_ready", async () => {
    const snap = seedF35BrowserV1Fixture();
    const fingerprint = trackFingerprint();
    const fetchImpl = createFetchImpl();
    const onComplete = vi.fn();

    render(<DashboardMigrationPanel onComplete={onComplete} fetchImpl={fetchImpl} />);
    fireEvent.click(await screen.findByRole("button", { name: "Migrar dados para V2" }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1), { timeout: 30_000 });

    const marker = loadMigrationMarker(accountId);
    expect(marker?.v1ToV2Complete).toBe(true);
    expect(marker?.fingerprint).toBe(fingerprint);

    const jobs = await applyflowPrisma.applyFlowJob.findMany({
      where: { accountId, id: { in: [F35_JOB_1, F35_JOB_2] } },
    });
    const apps = await applyflowPrisma.applyFlowApplication.findMany({
      where: { accountId, id: { in: [F35_APP_LINKED, F35_APP_STANDALONE] } },
    });
    expect(jobs).toHaveLength(2);
    expect(apps).toHaveLength(2);
    const linked = apps.find((a) => a.id === F35_APP_LINKED);
    const standalone = apps.find((a) => a.id === F35_APP_STANDALONE);
    expect(linked?.sourceJobId).toBe(F35_JOB_1);
    expect(standalone?.sourceJobId).toBeNull();
    expect(linked?.appliedAt?.toISOString()).toBe(new Date(F35_APPLIED_AT).toISOString());

    const session = await applyflowPrisma.applyFlowMigrationSession.findFirst({
      where: { accountId, bundleFingerprint: fingerprint },
    });
    expect(session?.status).toBe("completed");
    expect(session?.expectedJobs).toBe(2);
    expect(session?.expectedApplications).toBe(2);
    expect(session?.processedJobs).toBe(2);
    expect(session?.processedApplications).toBe(2);

    // V1 backup retained unchanged
    expect(window.localStorage.getItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY)).toBe(snap.jobsRaw);
    expect(window.localStorage.getItem(APPLYFLOW_DASHBOARD_STORAGE_KEY)).toBe(snap.appsRaw);
    expect(window.localStorage.getItem(APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY)).toBe(
      snap.analyticsRaw,
    );

    const opened = await openDashboardPersistence({
      persistenceV2Enabled: true,
      fetchImpl,
      accountId,
    });
    expect(opened.kind).toBe("ready");
    if (opened.kind !== "ready") return;
    expect(opened.jobs.some((j) => j.id === F35_JOB_1)).toBe(true);
    expect(opened.applications.some((a) => a.id === F35_APP_LINKED)).toBe(true);
  });

  it("idempotent retry reuses completed session without duplicates", async () => {
    seedF35BrowserV1Fixture();
    const fingerprint = trackFingerprint();
    const fetchImpl = createFetchImpl();

    const first = await runMigration({ fetchImpl, accountId });
    expect(first.ok).toBe(true);
    const second = await resumeMigration({ fetchImpl, accountId });
    expect(second.ok).toBe(true);

    const jobCount = await applyflowPrisma.applyFlowJob.count({
      where: { accountId, id: { startsWith: "e2e_f35_" } },
    });
    const appCount = await applyflowPrisma.applyFlowApplication.count({
      where: { accountId, id: { startsWith: "e2e_f35_" } },
    });
    expect(jobCount).toBe(2);
    expect(appCount).toBe(2);

    const sessions = await applyflowPrisma.applyFlowMigrationSession.findMany({
      where: { accountId, bundleFingerprint: fingerprint },
    });
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.status).toBe("completed");
  });

  it("lost completion response: retry recovers proof and writes marker", async () => {
    seedF35BrowserV1Fixture();
    trackFingerprint();
    const fetchImpl = createFetchImpl();

    // Complete server-side without marker (simulate lost response)
    const prep = prepareMigrationBundle();
    expect(prep.ok && !prep.empty).toBe(true);
    if (!prep.ok || prep.empty) return;
    fingerprints.add(prep.bundle.fingerprint);

    const request = new Request("http://localhost/api/applyflow/v2/migration", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(prep.bundle),
    });
    const response = await migrationPost(request);
    expect(response.status).toBe(200);
    window.localStorage.removeItem(APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY);
    expect(loadMigrationMarker(accountId)).toBeNull();

    const recovered = await resumeMigration({ fetchImpl, accountId });
    expect(recovered.ok).toBe(true);
    expect(loadMigrationMarker(accountId)?.fingerprint).toBe(prep.bundle.fingerprint);

    const jobs = await applyflowPrisma.applyFlowJob.count({
      where: { accountId, id: { startsWith: "e2e_f35_" } },
    });
    expect(jobs).toBe(2);
  });

  it("marker write failure then retry recovers without claiming premature success", async () => {
    seedF35BrowserV1Fixture();
    trackFingerprint();
    const fetchImpl = createFetchImpl();
    const writeSpy = vi
      .spyOn(migrationMarker, "persistMigrationMarker")
      .mockImplementationOnce(() => {
        throw new Error("quota");
      });

    const failed = await runMigration({ fetchImpl, accountId });
    expect(failed.ok).toBe(false);
    if (failed.ok) return;
    expect(failed.code).toBe("marker_write_failed");
    expect(loadMigrationMarker(accountId)).toBeNull();
    writeSpy.mockRestore();

    const recovered = await resumeMigration({ fetchImpl, accountId });
    expect(recovered.ok).toBe(true);
    expect(loadMigrationMarker(accountId)?.v1ToV2Complete).toBe(true);
  });

  it("stale marker does not unlock changed V1 dataset", async () => {
    seedF35BrowserV1Fixture();
    const fingerprint = trackFingerprint();
    const fetchImpl = createFetchImpl();
    const migrated = await runMigration({ fetchImpl, accountId });
    expect(migrated.ok).toBe(true);

    // Change logical V1 dataset
    const jobs = [
      ...JSON.parse(window.localStorage.getItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY)!).jobs,
    ];
    jobs[0] = { ...jobs[0], title: "E2E Persistence Engineer CHANGED" };
    persistDashboardJobs(jobs);

    const opened = await openDashboardPersistence({
      persistenceV2Enabled: true,
      fetchImpl,
      accountId,
    });
    expect(opened.kind).toBe("migration_required");
    // old marker still physically present but fingerprint mismatch
    const rawMarker = window.localStorage.getItem(APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY);
    expect(rawMarker).toBeTruthy();
    expect(JSON.parse(rawMarker!).fingerprint).toBe(fingerprint);

    // restore fixture for cleanup fingerprint tracking
    seedF35BrowserV1Fixture();
    trackFingerprint();
  });

  it("unauthenticated migration cannot execute", async () => {
    seedF35BrowserV1Fixture();
    trackFingerprint();
    vi.mocked(requireApplyFlowAccount).mockRejectedValueOnce(
      new ApplyFlowAuthError("unauthenticated", "no session"),
    );
    const result = await runMigration({ fetchImpl: createFetchImpl({ unauthenticated: true }) });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("auth_required");
    expect(loadMigrationMarker(accountId)).toBeNull();
    expect(window.localStorage.getItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY)).toBeTruthy();
  });

  it("conflict: divergent server job blocks completion; V1 intact; no marker", async () => {
    seedF35BrowserV1Fixture();
    const fingerprint = trackFingerprint();
    const snapJobs = window.localStorage.getItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY);

    await applyflowPrisma.applyFlowJob.create({
      data: {
        accountId,
        id: F35_JOB_1,
        title: "DIVERGENT SERVER TITLE",
        source: "paste",
        status: "reviewing",
        jobContext: { skills: ["Other"] },
        jobMatch: {
          score: 1,
          decision: "skip",
          matchedSkills: [],
          missingSkills: [],
          evaluatedAt: "2026-01-01T00:00:00.000Z",
          scoringVersion: "v1",
        },
      },
    });

    const result = await runMigration({ fetchImpl: createFetchImpl(), accountId });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("migration_conflict");
    expect(loadMigrationMarker(accountId)).toBeNull();
    expect(window.localStorage.getItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY)).toBe(snapJobs);

    const serverJob = await applyflowPrisma.applyFlowJob.findUnique({
      where: { accountId_id: { accountId, id: F35_JOB_1 } },
    });
    expect(serverJob?.title).toBe("DIVERGENT SERVER TITLE");

    const session = await applyflowPrisma.applyFlowMigrationSession.findFirst({
      where: { accountId, bundleFingerprint: fingerprint },
    });
    expect(session?.status).not.toBe("completed");

    // cleanup conflict rows for this fingerprint path
    await cleanupAllF35ForAccount(applyflowPrisma, accountId, [fingerprint]);
  });

  it("dataset too large blocks before POST", async () => {
    const template = buildF35Jobs()[0]!;
    const jobs = Array.from({ length: 51 }, (_, i) => ({
      ...template,
      id: `e2e_f35_overflow_${String(i).padStart(3, "0")}`,
      title: `Overflow ${i}`,
    }));
    window.localStorage.setItem(
      APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY,
      JSON.stringify({ version: 1, savedAt: "2026-09-20T12:00:00.000Z", jobs }),
    );
    window.localStorage.setItem(
      APPLYFLOW_DASHBOARD_STORAGE_KEY,
      JSON.stringify({ version: 1, importedAt: "2026-09-20T12:00:00.000Z", applications: [] }),
    );

    const postSpy = vi.fn();
    const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/migration") && init?.method === "POST") {
        postSpy();
      }
      return createFetchImpl()(input, init);
    };

    const result = await runMigration({ fetchImpl, accountId });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("migration_dataset_too_large");
    expect(postSpy).not.toHaveBeenCalled();
    expect(loadMigrationMarker(accountId)).toBeNull();
  });

  it("malformed legacy blocks before migration; physical key retained", async () => {
    window.localStorage.setItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY, "{not-json");
    const result = await runMigration({ fetchImpl: createFetchImpl(), accountId });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("legacy_unreadable");
    expect(window.localStorage.getItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY)).toBe("{not-json");
    expect(loadMigrationMarker(accountId)).toBeNull();
  });

  it("flag OFF uses V1 path and does not destroy V1 or server rows", async () => {
    seedF35BrowserV1Fixture();
    trackFingerprint();
    const fetchImpl = createFetchImpl();
    await runMigration({ fetchImpl, accountId });
    const jobsBefore = await applyflowPrisma.applyFlowJob.count({
      where: { accountId, id: { startsWith: "e2e_f35_" } },
    });
    expect(jobsBefore).toBeGreaterThan(0);
    const v1Raw = window.localStorage.getItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY);

    expect(selectDashboardPersistenceMode(false)).toBe("v1");
    const opened = await openDashboardPersistence({
      persistenceV2Enabled: false,
      fetchImpl,
    });
    expect(opened.kind).toBe("v1");
    expect(window.localStorage.getItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY)).toBe(v1Raw);
    const jobsAfter = await applyflowPrisma.applyFlowJob.count({
      where: { accountId, id: { startsWith: "e2e_f35_" } },
    });
    expect(jobsAfter).toBe(jobsBefore);
  });

  it("reload after marker yields v2_ready; before marker remains migration_required", async () => {
    seedF35BrowserV1Fixture();
    trackFingerprint();
    const fetchImpl = createFetchImpl();

    // before migration
    expect(
      (
        await openDashboardPersistence({
          persistenceV2Enabled: true,
          fetchImpl,
          accountId,
        })
      ).kind,
    ).toBe("migration_required");

    await runMigration({ fetchImpl, accountId });
    // after marker
    expect(
      (
        await openDashboardPersistence({
          persistenceV2Enabled: true,
          fetchImpl,
          accountId,
        })
      ).kind,
    ).toBe("ready");

    // after server completion before marker
    window.localStorage.removeItem(APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY);
    expect(
      (
        await openDashboardPersistence({
          persistenceV2Enabled: true,
          fetchImpl,
          accountId,
        })
      ).kind,
    ).toBe("migration_required");
    const recovered = await resumeMigration({ fetchImpl, accountId });
    expect(recovered.ok).toBe(true);
    expect(
      (
        await openDashboardPersistence({
          persistenceV2Enabled: true,
          fetchImpl,
          accountId,
        })
      ).kind,
    ).toBe("ready");
  });

  it("ownership: browser cannot force accountId via query; server uses session account", async () => {
    seedF35BrowserV1Fixture();
    const prep = prepareMigrationBundle();
    expect(prep.ok && !prep.empty).toBe(true);
    if (!prep.ok || prep.empty) return;
    fingerprints.add(prep.bundle.fingerprint);

    const request = new Request(
      "http://localhost/api/applyflow/v2/migration?accountId=attacker-account",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(prep.bundle),
      },
    );
    const response = await migrationPost(request);
    expect(response.status).toBe(200);
    // Query-string accountId must not create rows under a different account.
    // accountId is UUID-typed — prove ownership only via the authenticated account.
    const owned = await applyflowPrisma.applyFlowJob.count({
      where: { accountId, id: { startsWith: "e2e_f35_" } },
    });
    expect(owned).toBe(2);
    expect(vi.mocked(requireApplyFlowAccount)).toHaveBeenCalled();
  });
  },
  60_000,
);

describe("F3.5 offline invariants (no DEV mutation)", () => {
  it("migration modules do not reference chrome.storage", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const root = path.resolve(__dirname);
    const files = fs.readdirSync(root).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
    for (const file of files) {
      const text = fs.readFileSync(path.join(root, file), "utf8");
      expect(text).not.toMatch(/chrome\.storage/);
    }
  });

  it("inbound confirmation remains blocked under V2 gate semantics", async () => {
    const { assessDashboardMigrationGate } = await import(
      "@/lib/persistence-v2/dashboard/dashboard-persistence"
    );
    expect(
      assessDashboardMigrationGate({
        mode: "v2",
        legacyData: true,
        migration: { v1ToV2Complete: false },
      }),
    ).toBe("migration_required");
  });
});

// silence unused conflict constant for future conflict-id helpers
void F35_CONFLICT_JOB;
void F35_JOB_2;
void F35_APP_STANDALONE;
