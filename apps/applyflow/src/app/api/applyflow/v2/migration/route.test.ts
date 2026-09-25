import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/persistence-v2/feature-flag", () => ({
  isApplyFlowPersistenceV2Enabled: vi.fn(),
}));

vi.mock("@/lib/persistence-v2/require-applyflow-account", () => {
  class ApplyFlowAuthError extends Error {
    code: "unauthenticated" | "auth_not_configured";
    constructor(code: "unauthenticated" | "auth_not_configured", message: string) {
      super(message);
      this.code = code;
    }
  }
  class ApplyFlowPersistenceDisabledError extends Error {}
  return {
    requireApplyFlowAccount: vi.fn(),
    ApplyFlowAuthError,
    ApplyFlowPersistenceDisabledError,
  };
});

vi.mock("@/lib/persistence-v2/migration/migration-service", () => ({
  applyFlowMigrationService: {
    importBundle: vi.fn(),
    getSession: vi.fn(),
  },
}));

import { isApplyFlowPersistenceV2Enabled } from "@/lib/persistence-v2/feature-flag";
import { ApplyFlowMigrationServiceError } from "@/lib/persistence-v2/migration/migration-errors";
import { applyFlowMigrationService } from "@/lib/persistence-v2/migration/migration-service";
import {
  fingerprintMigrationBundle,
} from "@/lib/persistence-v2/migration/migration-fingerprint";
import {
  ApplyFlowAuthError,
  requireApplyFlowAccount,
} from "@/lib/persistence-v2/require-applyflow-account";
import { GET, POST } from "./route";

const account = {
  id: "account-server",
  authProviderSub: "sub-1",
  email: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const job = {
  id: "job_1",
  title: "Role",
  source: "paste" as const,
  status: "reviewing" as const,
  jobContext: { skills: ["React"] },
  jobMatch: {
    score: 80,
    decision: "apply" as const,
    matchedSkills: ["React"],
    missingSkills: [] as string[],
    evaluatedAt: "2026-09-25T12:00:00.000Z",
    scoringVersion: "v1",
  },
};

function validBody(overrides: Record<string, unknown> = {}) {
  const jobs = [job];
  const applications: unknown[] = [];
  return {
    sourceVersion: 1,
    fingerprint: fingerprintMigrationBundle({ jobs, applications: [] }),
    jobs,
    applications,
    ...overrides,
  };
}

function postRequest(body: unknown) {
  return new Request("http://localhost/api/applyflow/v2/migration?accountId=attacker", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Migration import route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isApplyFlowPersistenceV2Enabled).mockReturnValue(true);
    vi.mocked(requireApplyFlowAccount).mockResolvedValue(account);
  });

  it("returns 404 when persistence v2 is disabled", async () => {
    vi.mocked(isApplyFlowPersistenceV2Enabled).mockReturnValue(false);
    const response = await POST(postRequest(validBody()));
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "persistence_v2_disabled" });
    expect(requireApplyFlowAccount).not.toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireApplyFlowAccount).mockRejectedValue(
      new ApplyFlowAuthError("unauthenticated", "no session"),
    );
    const response = await POST(postRequest(validBody()));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "unauthenticated" });
  });

  it("returns 503 when auth is not configured", async () => {
    vi.mocked(requireApplyFlowAccount).mockRejectedValue(
      new ApplyFlowAuthError("auth_not_configured", "missing"),
    );
    const response = await POST(postRequest(validBody()));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "auth_not_configured" });
  });

  it("rejects invalid payload and oversized arrays", async () => {
    const invalid = await POST(postRequest({ sourceVersion: 1 }));
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toMatchObject({ error: "invalid_migration_payload" });

    const tooLarge = await POST(
      postRequest({
        sourceVersion: 1,
        fingerprint: "x",
        jobs: Array.from({ length: 51 }, (_, i) => ({ ...job, id: `job_${i}` })),
        applications: [],
      }),
    );
    expect(tooLarge.status).toBe(413);
    await expect(tooLarge.json()).resolves.toEqual({ error: "payload_too_large" });
  });

  it("rejects fingerprint mismatch", async () => {
    vi.mocked(applyFlowMigrationService.importBundle).mockRejectedValue(
      new ApplyFlowMigrationServiceError("migration_fingerprint_mismatch"),
    );
    const response = await POST(postRequest(validBody({ fingerprint: "deadbeef" })));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "migration_fingerprint_mismatch" });
  });

  it("returns completion proof on success and uses server account id", async () => {
    vi.mocked(applyFlowMigrationService.importBundle).mockResolvedValue({
      kind: "completed",
      proof: {
        sessionId: "session-1",
        status: "completed",
        fingerprint: "fp",
        sourceVersion: 1,
        expectedJobs: 1,
        expectedApplications: 0,
        processedJobs: 1,
        processedApplications: 0,
        completedAt: "2026-09-25T20:00:00.000Z",
      },
    });
    const body = validBody();
    const response = await POST(postRequest(body));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      sessionId: "session-1",
      status: "completed",
    });
    expect(applyFlowMigrationService.importBundle).toHaveBeenCalledWith("account-server", body);
  });

  it("returns conflict payload without overwriting semantics", async () => {
    vi.mocked(applyFlowMigrationService.importBundle).mockResolvedValue({
      kind: "failed",
      response: {
        sessionId: "session-2",
        status: "failed",
        fingerprint: "fp",
        conflicts: [{ entityType: "job", entityId: "job_1", reason: "same_id_different_content" }],
      },
    });
    const response = await POST(postRequest(validBody()));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "migration_conflict",
      status: "failed",
      conflicts: [{ entityId: "job_1", reason: "same_id_different_content" }],
    });
  });

  it("rejects GET on the collection route", async () => {
    const response = await GET();
    expect(response.status).toBe(405);
  });
});
