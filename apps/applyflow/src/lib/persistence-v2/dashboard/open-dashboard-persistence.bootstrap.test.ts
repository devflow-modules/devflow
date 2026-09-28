import { afterEach, describe, expect, it, vi } from "vitest";

import { APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY } from "@/lib/local-job-storage";
import type { ApplyFlowJob } from "@devflow/applyflow-core";

import {
  assertNeverPersistenceMode,
  createClientPersistenceBootstrap,
  type ApplyFlowClientPersistenceBootstrap,
  type ApplyFlowClientPersistenceMode,
} from "./client-persistence-bootstrap";
import { openDashboardPersistence } from "./open-dashboard-persistence";
import {
  APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY,
  type MigrationMarkerRecord,
} from "../migration/migration-marker";
import { fingerprintApplyFlowAccountId } from "../migration/migration-fingerprint";
import { prepareMigrationBundle } from "../migration/migration-prepare";

const ACCOUNT_ID = "acc-bootstrap-1";

const job: ApplyFlowJob = {
  id: "job_bootstrap",
  title: "Engineer",
  source: "paste",
  status: "reviewing",
  url: "https://jobs.example.com/role",
  jobContext: { skills: ["React"] },
  descriptionSnapshot: "React",
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

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function emptyCloudLists(fetchImpl: ReturnType<typeof vi.fn>) {
  fetchImpl.mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/me")) {
      return jsonResponse(200, {
        authenticated: true,
        account: { id: ACCOUNT_ID },
        persistence: { mode: "v2_active" },
      });
    }
    if (url.includes("/jobs")) return jsonResponse(200, { jobs: [] });
    if (url.includes("/applications")) return jsonResponse(200, { applications: [] });
    return jsonResponse(500, { error: "unexpected" });
  });
}

function bootstrap(mode: ApplyFlowClientPersistenceMode): ApplyFlowClientPersistenceBootstrap {
  switch (mode) {
    case "v1":
      return createClientPersistenceBootstrap({
        mode: "v1",
        reason: "global_disabled",
        canonicalPersistence: "v1_local",
        pilotEligible: false,
        accountId: ACCOUNT_ID,
      });
    case "v2_offering":
      return createClientPersistenceBootstrap({
        mode: "v2_offering",
        reason: "pilot_eligible",
        canonicalPersistence: "v1_local",
        pilotEligible: true,
        accountId: ACCOUNT_ID,
      });
    case "v2_active":
      return createClientPersistenceBootstrap({
        mode: "v2_active",
        reason: "canonical_v2",
        canonicalPersistence: "v2_cloud",
        pilotEligible: true,
        accountId: ACCOUNT_ID,
      });
    case "v2_read_only":
      return createClientPersistenceBootstrap({
        mode: "v2_read_only",
        reason: "pilot_revoked",
        canonicalPersistence: "v2_cloud",
        pilotEligible: false,
        accountId: ACCOUNT_ID,
      });
    case "v2_paused":
      return createClientPersistenceBootstrap({
        mode: "v2_paused",
        reason: "global_disabled_canonical_v2",
        canonicalPersistence: "v2_cloud",
        pilotEligible: true,
        accountId: ACCOUNT_ID,
      });
    default:
      return assertNeverPersistenceMode(mode);
  }
}

function completedMarker(fingerprint = "aabbccdd"): MigrationMarkerRecord {
  return {
    version: 1,
    v1ToV2Complete: true,
    accountIdFingerprint: fingerprintApplyFlowAccountId(ACCOUNT_ID),
    sessionId: "session_bootstrap_1",
    completedAt: "2026-09-25T20:00:00.000Z",
    fingerprint,
  };
}

describe("R2.2.4 authoritative client persistence bootstrap", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("1. server v1 → client opens V1 and does not call cloud lists", async () => {
    stubStorage();
    const fetchImpl = vi.fn();
    const opened = await openDashboardPersistence({ bootstrap: bootstrap("v1"), fetchImpl });
    expect(opened.kind).toBe("v1");
    if (opened.kind !== "v1") return;
    expect(opened.persistence.mode).toBe("v1");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("2. server v2_active → client opens writable V2", async () => {
    stubStorage();
    const fetchImpl = vi.fn();
    emptyCloudLists(fetchImpl);
    const opened = await openDashboardPersistence({ bootstrap: bootstrap("v2_active"), fetchImpl });
    expect(opened.kind).toBe("ready");
    if (opened.kind !== "ready") return;
    expect(opened.writeCapability).toBe("full");
    expect(opened.persistence.mode).toBe("v2");
    expect(fetchImpl).toHaveBeenCalled();
  });

  it("3. server v2_read_only → client opens cloud read-only", async () => {
    stubStorage();
    const fetchImpl = vi.fn();
    emptyCloudLists(fetchImpl);
    const opened = await openDashboardPersistence({ bootstrap: bootstrap("v2_read_only"), fetchImpl });
    expect(opened.kind).toBe("ready");
    if (opened.kind !== "ready") return;
    expect(opened.writeCapability).toBe("read_only");
    const denied = await opened.persistence.createJob(job);
    expect(denied).toEqual({ ok: false, code: "read_only" });
  });

  it("4. server v2_paused → client DOES NOT open V1", async () => {
    stubStorage({
      [APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]: JSON.stringify({
        version: 1,
        savedAt: "2026-09-25T12:00:00.000Z",
        jobs: [job],
      }),
    });
    const fetchImpl = vi.fn();
    const opened = await openDashboardPersistence({ bootstrap: bootstrap("v2_paused"), fetchImpl });
    expect(opened.kind).toBe("paused");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("5. server v2_paused → client DOES NOT open writable V2", async () => {
    stubStorage();
    const fetchImpl = vi.fn();
    emptyCloudLists(fetchImpl);
    const opened = await openDashboardPersistence({ bootstrap: bootstrap("v2_paused"), fetchImpl });
    expect(opened.kind).toBe("paused");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("6. v2_offering + legacy data → migration_required", async () => {
    stubStorage({
      [APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]: JSON.stringify({
        version: 1,
        savedAt: "2026-09-25T12:00:00.000Z",
        jobs: [job],
      }),
    });
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/me")) {
        return jsonResponse(200, { authenticated: true, account: { id: ACCOUNT_ID } });
      }
      return jsonResponse(500, { error: "unexpected" });
    });
    const opened = await openDashboardPersistence({ bootstrap: bootstrap("v2_offering"), fetchImpl });
    expect(opened.kind).toBe("migration_required");
  });

  it("7. v2_offering + empty V1 → no arbitrary V2 write (empty pending on V1)", async () => {
    stubStorage();
    const fetchImpl = vi.fn();
    emptyCloudLists(fetchImpl);
    const opened = await openDashboardPersistence({ bootstrap: bootstrap("v2_offering"), fetchImpl });
    expect(opened.kind).toBe("v2_offering_empty_pending");
    if (opened.kind !== "v2_offering_empty_pending") return;
    expect(opened.persistence.mode).toBe("v1");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("8. local marker completed + server v1 → V1 / server wins", async () => {
    const storage = stubStorage({
      [APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]: JSON.stringify({
        version: 1,
        savedAt: "2026-09-25T12:00:00.000Z",
        jobs: [job],
      }),
    });
    const prep = prepareMigrationBundle();
    expect(prep.ok).toBe(true);
    if (!prep.ok) return;
    storage[APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY] = JSON.stringify(
      completedMarker(prep.bundle.fingerprint),
    );
    const fetchImpl = vi.fn();
    emptyCloudLists(fetchImpl);
    const opened = await openDashboardPersistence({ bootstrap: bootstrap("v1"), fetchImpl });
    expect(opened.kind).toBe("v1");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("9. local marker completed + server v2_paused → paused / server wins", async () => {
    const storage = stubStorage({
      [APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]: JSON.stringify({
        version: 1,
        savedAt: "2026-09-25T12:00:00.000Z",
        jobs: [job],
      }),
    });
    const prep = prepareMigrationBundle();
    expect(prep.ok).toBe(true);
    if (!prep.ok) return;
    storage[APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY] = JSON.stringify(
      completedMarker(prep.bundle.fingerprint),
    );
    const fetchImpl = vi.fn();
    emptyCloudLists(fetchImpl);
    const opened = await openDashboardPersistence({ bootstrap: bootstrap("v2_paused"), fetchImpl });
    expect(opened.kind).toBe("paused");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("10. bootstrap failure path stays fail-closed (no silent V1 from open)", async () => {
    // openDashboardPersistence requires a positively resolved bootstrap.
    // Absence of bootstrap is handled by RSC → bootstrap_unavailable UI.
    // Exhaustiveness: every mode is handled without a V1 default fallthrough.
    const modes: ApplyFlowClientPersistenceMode[] = [
      "v1",
      "v2_offering",
      "v2_active",
      "v2_read_only",
      "v2_paused",
    ];
    stubStorage();
    const fetchImpl = vi.fn();
    emptyCloudLists(fetchImpl);
    for (const mode of modes) {
      const opened = await openDashboardPersistence({ bootstrap: bootstrap(mode), fetchImpl });
      if (mode === "v2_paused") expect(opened.kind).toBe("paused");
      if (mode === "v1") expect(opened.kind).toBe("v1");
      if (mode === "v2_offering") expect(opened.kind).toBe("v2_offering_empty_pending");
      if (mode === "v2_active" || mode === "v2_read_only") expect(opened.kind).toBe("ready");
    }
  });

  it("marker completed under offering does not open canonical V2 (pending R2.2.5)", async () => {
    const storage = stubStorage({
      [APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY]: JSON.stringify({
        version: 1,
        savedAt: "2026-09-25T12:00:00.000Z",
        jobs: [job],
      }),
    });
    const prep = prepareMigrationBundle();
    expect(prep.ok).toBe(true);
    if (!prep.ok) return;
    storage[APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY] = JSON.stringify(
      completedMarker(prep.bundle.fingerprint),
    );
    const fetchImpl = vi.fn();
    emptyCloudLists(fetchImpl);
    const opened = await openDashboardPersistence({ bootstrap: bootstrap("v2_offering"), fetchImpl });
    expect(opened.kind).toBe("migration_complete_pending_activation");
    if (opened.kind !== "migration_complete_pending_activation") return;
    expect(opened.persistence.mode).toBe("v1");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("TypeScript exhaustiveness helper rejects unknown modes at runtime", () => {
    expect(() => assertNeverPersistenceMode("future_mode" as never)).toThrow(/Unhandled persistence mode/);
  });
});
