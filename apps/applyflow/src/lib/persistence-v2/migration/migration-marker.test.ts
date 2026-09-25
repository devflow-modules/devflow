import { afterEach, describe, expect, it, vi } from "vitest";

import { fingerprintApplyFlowAccountId } from "./migration-fingerprint";
import {
  APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY,
  clearMigrationMarker,
  loadMigrationMarker,
  parseMigrationMarkerRecord,
  persistMigrationMarker,
  type MigrationMarkerRecord,
} from "./migration-marker";

const ACCOUNT = "acc-1111-2222-3333";
const OTHER = "acc-9999-8888-7777";

function validMarker(accountId = ACCOUNT): MigrationMarkerRecord {
  return {
    version: 1,
    v1ToV2Complete: true,
    accountIdFingerprint: fingerprintApplyFlowAccountId(accountId),
    sessionId: "session_test_1",
    completedAt: "2026-09-25T20:00:00.000Z",
    fingerprint: "deadbeef",
  };
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

describe("migration marker", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null without window", () => {
    expect(loadMigrationMarker(ACCOUNT)).toBeNull();
  });

  it("loads a valid completed marker for the current account", () => {
    const storage = stubStorage();
    persistMigrationMarker(validMarker());
    expect(loadMigrationMarker(ACCOUNT)).toEqual(validMarker());
    expect(storage[APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY]).toContain("session_test_1");
  });

  it("rejects incomplete, malformed, and other-account markers", () => {
    expect(parseMigrationMarkerRecord({ ...validMarker(), v1ToV2Complete: false }, fingerprintApplyFlowAccountId(ACCOUNT))).toBeNull();
    expect(parseMigrationMarkerRecord({ ...validMarker(), version: 2 }, fingerprintApplyFlowAccountId(ACCOUNT))).toBeNull();
    expect(parseMigrationMarkerRecord({ ...validMarker(), sessionId: "" }, fingerprintApplyFlowAccountId(ACCOUNT))).toBeNull();
    expect(parseMigrationMarkerRecord({ ...validMarker(), completedAt: "not-a-date" }, fingerprintApplyFlowAccountId(ACCOUNT))).toBeNull();
    expect(parseMigrationMarkerRecord({ ...validMarker(), fingerprint: "  " }, fingerprintApplyFlowAccountId(ACCOUNT))).toBeNull();
    expect(parseMigrationMarkerRecord(validMarker(OTHER), fingerprintApplyFlowAccountId(ACCOUNT))).toBeNull();
    expect(parseMigrationMarkerRecord("{", fingerprintApplyFlowAccountId(ACCOUNT))).toBeNull();
    expect(parseMigrationMarkerRecord(null, fingerprintApplyFlowAccountId(ACCOUNT))).toBeNull();

    stubStorage({ [APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY]: "{not-json" });
    expect(loadMigrationMarker(ACCOUNT)).toBeNull();

    stubStorage({
      [APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY]: JSON.stringify(validMarker(OTHER)),
    });
    expect(loadMigrationMarker(ACCOUNT)).toBeNull();
  });

  it("treats storage read exceptions as no completion proof", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("quota");
        },
        setItem: () => undefined,
        removeItem: () => undefined,
      },
    });
    expect(loadMigrationMarker(ACCOUNT)).toBeNull();
  });

  it("clears only the migration marker key", () => {
    const storage = stubStorage({
      APPLYFLOW_DASHBOARD_JOBS_V1: "keep-me",
      [APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY]: JSON.stringify(validMarker()),
    });
    clearMigrationMarker();
    expect(storage[APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY]).toBeUndefined();
    expect(storage.APPLYFLOW_DASHBOARD_JOBS_V1).toBe("keep-me");
  });

  it("does not persist incomplete markers", () => {
    const storage = stubStorage();
    persistMigrationMarker({ ...validMarker(), v1ToV2Complete: false });
    expect(storage[APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY]).toBeUndefined();
  });
});
