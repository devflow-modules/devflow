import { afterEach, describe, expect, it, vi } from "vitest";

import {
  canonicalizeForFingerprint,
  fingerprintApplyFlowAccountId,
  fingerprintMigrationBundle,
  type MigrationApplicationFingerprintInput,
  type MigrationJobFingerprintInput,
} from "./migration-fingerprint";

const jobA: MigrationJobFingerprintInput = {
  id: "job_b",
  title: "Role B",
  source: "paste",
  status: "reviewing",
  jobContext: { skills: ["Go"] },
  jobMatch: { score: 1, decision: "apply", matchedSkills: [], missingSkills: [], evaluatedAt: "t", scoringVersion: "v1" },
};

const jobB: MigrationJobFingerprintInput = {
  id: "job_a",
  title: "Role A",
  company: "Acme",
  source: "paste",
  status: "applied",
  jobContext: { skills: ["React"] },
  descriptionSnapshot: "React",
  jobMatch: { score: 2, decision: "apply", matchedSkills: ["React"], missingSkills: [], evaluatedAt: "t", scoringVersion: "v1" },
};

const appA: MigrationApplicationFingerprintInput = {
  id: "app_b",
  source: "paste",
  status: "reviewing",
  sourceJobId: "job_b",
};

const appB: MigrationApplicationFingerprintInput = {
  id: "app_a",
  source: "json",
  status: "applied",
  sourceJobId: "job_a",
  jobTitle: "Role A",
};

describe("migration fingerprint", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fingerprints account ids without echoing the raw id", () => {
    const fingerprint = fingerprintApplyFlowAccountId("acc-stable-1");
    expect(fingerprint).toMatch(/^[0-9a-f]{8}$/);
    expect(fingerprint).not.toContain("acc-stable");
    expect(fingerprintApplyFlowAccountId("acc-stable-1")).toBe(fingerprint);
    expect(fingerprintApplyFlowAccountId("acc-stable-2")).not.toBe(fingerprint);
  });

  it("keeps the same bundle fingerprint across key order and job/app list order", () => {
    const left = fingerprintMigrationBundle({
      jobs: [jobA, jobB],
      applications: [appA, appB],
    });
    const right = fingerprintMigrationBundle({
      jobs: [jobB, jobA],
      applications: [appB, appA],
    });
    expect(left).toBe(right);
    expect(canonicalizeForFingerprint({ b: 1, a: 2 })).toBe(canonicalizeForFingerprint({ a: 2, b: 1 }));
  });

  it("ignores volatile envelope timestamps outside the identity payload", () => {
    const base = fingerprintMigrationBundle({ jobs: [jobB], applications: [appB] });
    const again = fingerprintMigrationBundle({
      jobs: [{ ...jobB }],
      applications: [{ ...appB }],
    });
    expect(again).toBe(base);
  });

  it("changes when a preserved id or material field changes", () => {
    const base = fingerprintMigrationBundle({ jobs: [jobB], applications: [appB] });
    expect(
      fingerprintMigrationBundle({
        jobs: [{ ...jobB, id: "job_other" }],
        applications: [appB],
      }),
    ).not.toBe(base);
    expect(
      fingerprintMigrationBundle({
        jobs: [{ ...jobB, title: "Other title" }],
        applications: [appB],
      }),
    ).not.toBe(base);
    expect(
      fingerprintMigrationBundle({
        jobs: [jobB],
        applications: [{ ...appB, status: "interview" }],
      }),
    ).not.toBe(base);
  });
});
