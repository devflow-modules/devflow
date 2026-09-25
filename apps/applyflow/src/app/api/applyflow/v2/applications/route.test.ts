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

vi.mock("@/lib/persistence-v2/applications/application-service", () => ({
  applyFlowApplicationService: {
    list: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

import {
  ApplyFlowAuthError,
  requireApplyFlowAccount,
} from "@/lib/persistence-v2/require-applyflow-account";
import { isApplyFlowPersistenceV2Enabled } from "@/lib/persistence-v2/feature-flag";
import { ApplyFlowApplicationServiceError } from "@/lib/persistence-v2/applications/application-errors";
import { applyFlowApplicationService } from "@/lib/persistence-v2/applications/application-service";
import { GET, POST } from "./route";

const account = {
  id: "account-server",
  authProviderSub: "sub-1",
  email: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const application = {
  id: "app_client",
  sourceJobId: null,
  source: "linkedin",
  status: "reviewing",
  jobTitle: "Role",
  companyName: null,
  jobUrl: null,
  fitScore: null,
  notes: null,
  jobMeta: null,
  v2Meta: null,
  extras: null,
  appliedAt: null,
  version: 1,
  createdAt: "2026-09-25T15:00:00.000Z",
  updatedAt: "2026-09-25T15:00:00.000Z",
};

describe("Application collection routes", () => {
  beforeEach(() => {
    vi.mocked(isApplyFlowPersistenceV2Enabled).mockReturnValue(true);
    vi.mocked(requireApplyFlowAccount).mockResolvedValue(account);
    vi.mocked(applyFlowApplicationService.list).mockReset();
    vi.mocked(applyFlowApplicationService.create).mockReset();
  });

  it("returns 404 when Persistence V2 is disabled", async () => {
    vi.mocked(isApplyFlowPersistenceV2Enabled).mockReturnValue(false);
    const response = await GET();
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "persistence_v2_disabled" });
    expect(requireApplyFlowAccount).not.toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireApplyFlowAccount).mockRejectedValue(
      new ApplyFlowAuthError("unauthenticated", "Authentication required."),
    );
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("lists applications for the server account", async () => {
    vi.mocked(applyFlowApplicationService.list).mockResolvedValue([application]);
    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ applications: [application] });
    expect(applyFlowApplicationService.list).toHaveBeenCalledWith("account-server");
  });

  it("creates with the server account and preserves the client id", async () => {
    vi.mocked(applyFlowApplicationService.create).mockResolvedValue(application);
    const response = await POST(
      new Request("http://localhost/api/applyflow/v2/applications?accountId=attacker", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: "app_client", jobTitle: "Role" }),
      }),
    );
    expect(response.status).toBe(201);
    expect(response.headers.get("ETag")).toBe('"1"');
    expect(applyFlowApplicationService.create).toHaveBeenCalledWith(
      "account-server",
      expect.objectContaining({ id: "app_client" }),
    );
  });

  it("returns 400 for a malformed body and 409 for a duplicate id", async () => {
    const malformed = await POST(
      new Request("http://localhost/api/applyflow/v2/applications", {
        method: "POST",
        body: JSON.stringify({ status: "not-a-status" }),
      }),
    );
    expect(malformed.status).toBe(400);
    await expect(malformed.json()).resolves.toEqual({ error: "invalid_payload" });

    vi.mocked(applyFlowApplicationService.create).mockRejectedValue(
      new ApplyFlowApplicationServiceError("application_already_exists"),
    );
    const duplicate = await POST(
      new Request("http://localhost/api/applyflow/v2/applications", {
        method: "POST",
        body: JSON.stringify({ id: "app_client" }),
      }),
    );
    expect(duplicate.status).toBe(409);
    await expect(duplicate.json()).resolves.toEqual({ error: "application_already_exists" });
  });

  it("maps create-from-job conflicts and a missing source job", async () => {
    vi.mocked(applyFlowApplicationService.create).mockRejectedValueOnce(
      new ApplyFlowApplicationServiceError("source_job_not_found"),
    );
    const missing = await POST(
      new Request("http://localhost/api/applyflow/v2/applications", {
        method: "POST",
        body: JSON.stringify({ sourceJobId: "job_missing" }),
      }),
    );
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ error: "source_job_not_found" });

    vi.mocked(applyFlowApplicationService.create).mockRejectedValueOnce(
      new ApplyFlowApplicationServiceError("application_already_exists_for_job"),
    );
    const duplicateJob = await POST(
      new Request("http://localhost/api/applyflow/v2/applications", {
        method: "POST",
        body: JSON.stringify({ sourceJobId: "job_1" }),
      }),
    );
    expect(duplicateJob.status).toBe(409);
    await expect(duplicateJob.json()).resolves.toEqual({ error: "application_already_exists_for_job" });
  });

  it("returns 503 when auth is not configured and 500 for unexpected failures", async () => {
    vi.mocked(requireApplyFlowAccount).mockRejectedValueOnce(
      new ApplyFlowAuthError("auth_not_configured", "Auth is not configured."),
    );
    const unconfigured = await GET();
    expect(unconfigured.status).toBe(503);
    await expect(unconfigured.json()).resolves.toEqual({ error: "auth_not_configured" });

    vi.mocked(requireApplyFlowAccount).mockResolvedValue(account);
    vi.mocked(applyFlowApplicationService.list).mockRejectedValueOnce(new Error("database url leaked"));
    const failed = await GET();
    expect(failed.status).toBe(500);
    await expect(failed.json()).resolves.toEqual({ error: "internal_error" });
  });
});
