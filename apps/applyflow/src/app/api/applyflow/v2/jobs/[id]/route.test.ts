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

vi.mock("@/lib/persistence-v2/jobs/job-service", () => ({
  applyFlowJobService: {
    list: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

import { isApplyFlowPersistenceV2Enabled } from "@/lib/persistence-v2/feature-flag";
import { ApplyFlowJobServiceError } from "@/lib/persistence-v2/jobs/job-errors";
import { applyFlowJobService } from "@/lib/persistence-v2/jobs/job-service";
import { requireApplyFlowAccount } from "@/lib/persistence-v2/require-applyflow-account";
import { GET, PATCH } from "./route";

const account = {
  id: "account-server",
  authProviderSub: "sub-1",
  email: null,
  pilotEligible: true,
  canonicalPersistence: "v2_cloud" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const job = {
  id: "job_client_fixed",
  title: "Updated title",
  company: null,
  location: null,
  url: null,
  canonicalUrl: null,
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
  evaluatedWith: null,
  curriculumRecommendation: null,
  applicationPack: null,
  descriptionSnapshot: null,
  descriptionHash: null,
  version: 2,
  createdAt: "2026-09-25T12:00:00.000Z",
  updatedAt: "2026-09-25T12:01:00.000Z",
};

const context = { params: Promise.resolve({ id: "job_client_fixed" }) };

function patchRequest(body: unknown) {
  return new Request("http://localhost/api/applyflow/v2/jobs/job_client_fixed?accountId=attacker", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Job item routes", () => {
  beforeEach(() => {
    vi.mocked(isApplyFlowPersistenceV2Enabled).mockReturnValue(true);
    vi.mocked(requireApplyFlowAccount).mockResolvedValue(account);
    vi.mocked(applyFlowJobService.get).mockReset();
    vi.mocked(applyFlowJobService.patch).mockReset();
  });

  it("returns the job for the server account", async () => {
    vi.mocked(applyFlowJobService.get).mockResolvedValue(job);
    const response = await GET(new Request("http://localhost/api/applyflow/v2/jobs/job_client_fixed"), context);
    expect(response.status).toBe(200);
    expect(response.headers.get("ETag")).toBe('"2"');
    expect(applyFlowJobService.get).toHaveBeenCalledWith("account-server", "job_client_fixed");
  });

  it("denies product GET for offering accounts (AF-REL-003)", async () => {
    vi.mocked(requireApplyFlowAccount).mockResolvedValue({
      ...account,
      pilotEligible: true,
      canonicalPersistence: "v1_local",
    });
    const response = await GET(new Request("http://localhost/api/applyflow/v2/jobs/job_client_fixed"), context);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "persistence_v2_migration_required" });
    expect(applyFlowJobService.get).not.toHaveBeenCalled();
  });

  it("allows product GET for read_only cloud accounts", async () => {
    vi.mocked(requireApplyFlowAccount).mockResolvedValue({
      ...account,
      pilotEligible: false,
      canonicalPersistence: "v2_cloud",
    });
    vi.mocked(applyFlowJobService.get).mockResolvedValue(job);
    const response = await GET(new Request("http://localhost/api/applyflow/v2/jobs/job_client_fixed"), context);
    expect(response.status).toBe(200);
    expect(applyFlowJobService.get).toHaveBeenCalledWith("account-server", "job_client_fixed");
  });

  it("returns 404 for a missing or cross-account job", async () => {
    vi.mocked(applyFlowJobService.get).mockRejectedValue(new ApplyFlowJobServiceError("not_found"));
    const response = await GET(new Request("http://localhost/api/applyflow/v2/jobs/job_client_fixed"), context);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "not_found" });
  });

  it("patches with expectedVersion and returns the incremented version", async () => {
    vi.mocked(applyFlowJobService.patch).mockResolvedValue(job);
    const response = await PATCH(patchRequest({ title: "Updated title", expectedVersion: 1 }), context);
    expect(response.status).toBe(200);
    expect(response.headers.get("ETag")).toBe('"2"');
    expect(applyFlowJobService.patch).toHaveBeenCalledWith(
      "account-server",
      "job_client_fixed",
      1,
      expect.objectContaining({ title: "Updated title" }),
    );
    const patchBody = vi.mocked(applyFlowJobService.patch).mock.calls[0][3];
    expect(patchBody).not.toHaveProperty("id");
    expect(patchBody).not.toHaveProperty("accountId");
    expect(patchBody).not.toHaveProperty("expectedVersion");
  });

  it("returns 409 for a stale version and 404 when the job is missing", async () => {
    vi.mocked(applyFlowJobService.patch).mockRejectedValueOnce(new ApplyFlowJobServiceError("version_conflict"));
    const stale = await PATCH(patchRequest({ title: "Stale", expectedVersion: 1 }), context);
    expect(stale.status).toBe(409);
    await expect(stale.json()).resolves.toEqual({ error: "version_conflict" });

    vi.mocked(applyFlowJobService.patch).mockRejectedValueOnce(new ApplyFlowJobServiceError("not_found"));
    const missing = await PATCH(patchRequest({ title: "Missing", expectedVersion: 1 }), context);
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ error: "not_found" });
  });

  it("returns 400 for an invalid body, an empty patch, and an id mutation", async () => {
    const invalid = await PATCH(patchRequest({ title: "", expectedVersion: 1 }), context);
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: "invalid_payload" });

    const empty = await PATCH(patchRequest({ expectedVersion: 1 }), context);
    expect(empty.status).toBe(400);
    await expect(empty.json()).resolves.toEqual({ error: "empty_patch" });

    const identity = await PATCH(patchRequest({ id: "job_other", title: "Nope", expectedVersion: 1 }), context);
    expect(identity.status).toBe(400);
    expect(applyFlowJobService.patch).not.toHaveBeenCalled();
  });

  it("returns 400 when expectedVersion is missing or invalid", async () => {
    const missing = await PATCH(patchRequest({ title: "Next" }), context);
    expect(missing.status).toBe(400);
    await expect(missing.json()).resolves.toEqual({ error: "invalid_expected_version" });
    expect(applyFlowJobService.patch).not.toHaveBeenCalled();

    const zero = await PATCH(patchRequest({ title: "Next", expectedVersion: 0 }), context);
    expect(zero.status).toBe(400);
    await expect(zero.json()).resolves.toEqual({ error: "invalid_expected_version" });
  });
});
