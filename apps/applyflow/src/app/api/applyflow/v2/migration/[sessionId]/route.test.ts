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
  ApplyFlowAuthError,
  requireApplyFlowAccount,
} from "@/lib/persistence-v2/require-applyflow-account";
import { GET } from "./route";

const account = {
  id: "account-server",
  authProviderSub: "sub-1",
  email: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Migration session route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isApplyFlowPersistenceV2Enabled).mockReturnValue(true);
    vi.mocked(requireApplyFlowAccount).mockResolvedValue(account);
  });

  it("returns completion proof for owned sessions", async () => {
    vi.mocked(applyFlowMigrationService.getSession).mockResolvedValue({
      sessionId: "session-1",
      status: "completed",
      fingerprint: "fp",
      sourceVersion: 1,
      expectedJobs: 1,
      expectedApplications: 0,
      processedJobs: 1,
      processedApplications: 0,
      completedAt: "2026-09-25T20:00:00.000Z",
    });
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ sessionId: "session-1" }),
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "completed", sessionId: "session-1" });
    expect(applyFlowMigrationService.getSession).toHaveBeenCalledWith("account-server", "session-1");
  });

  it("returns not found for missing or cross-account sessions", async () => {
    vi.mocked(applyFlowMigrationService.getSession).mockRejectedValue(
      new ApplyFlowMigrationServiceError("migration_session_not_found"),
    );
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ sessionId: "missing" }),
    });
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "migration_session_not_found" });
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireApplyFlowAccount).mockRejectedValue(
      new ApplyFlowAuthError("unauthenticated", "no session"),
    );
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ sessionId: "session-1" }),
    });
    expect(response.status).toBe(401);
  });
});
