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
  id: "job_client_fixed",
  title: "Product Engineer",
  company: null,
  location: null,
  url: "https://jobs.example.com/acme/role",
  canonicalUrl: "https://jobs.example.com/acme/role",
  source: "paste",
  status: "reviewing",
  jobContext: { skills: ["React"] },
  descriptionSnapshot: "React TypeScript",
  descriptionHash: "abcd1234",
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
  version: 1,
  createdAt: "2026-09-25T12:00:00.000Z",
  updatedAt: "2026-09-25T12:00:00.000Z",
};

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    id: "job_client_fixed",
    title: "Product Engineer",
    source: "paste",
    status: "reviewing",
    url: "https://Jobs.Example.com/acme/role/",
    descriptionSnapshot: "React TypeScript",
    jobContext: { skills: ["React"] },
    jobMatch: job.jobMatch,
    ...overrides,
  };
}

function postRequest(body: unknown) {
  return new Request("http://localhost/api/applyflow/v2/jobs?accountId=attacker", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Jobs collection routes", () => {
  beforeEach(() => {
    vi.mocked(isApplyFlowPersistenceV2Enabled).mockReturnValue(true);
    vi.mocked(requireApplyFlowAccount).mockResolvedValue(account);
    vi.mocked(applyFlowJobService.list).mockReset();
    vi.mocked(applyFlowJobService.create).mockReset();
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
    await expect(response.json()).resolves.toEqual({ error: "unauthenticated" });
  });

  it("lists jobs for the server account only", async () => {
    vi.mocked(applyFlowJobService.list).mockResolvedValue([job]);
    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ jobs: [job] });
    expect(applyFlowJobService.list).toHaveBeenCalledWith("account-server");
  });

  it("creates a job with the server account and preserves the client id", async () => {
    vi.mocked(applyFlowJobService.create).mockResolvedValue(job);
    const response = await POST(postRequest(validBody()));
    expect(response.status).toBe(201);
    expect(response.headers.get("ETag")).toBe('"1"');
    expect(applyFlowJobService.create).toHaveBeenCalledWith(
      "account-server",
      expect.objectContaining({ id: "job_client_fixed" }),
    );
    const [, body] = vi.mocked(applyFlowJobService.create).mock.calls[0];
    expect(body).not.toHaveProperty("accountId");
  });

  it("returns 400 for a malformed job", async () => {
    const malformed = await POST(postRequest(validBody({ source: "fax" })));
    expect(malformed.status).toBe(400);
    await expect(malformed.json()).resolves.toEqual({ error: "invalid_payload" });
    expect(applyFlowJobService.create).not.toHaveBeenCalled();
  });

  it("returns 409 when the canonical id already exists", async () => {
    vi.mocked(applyFlowJobService.create).mockRejectedValue(new ApplyFlowJobServiceError("job_already_exists"));
    const duplicate = await POST(postRequest(validBody()));
    expect(duplicate.status).toBe(409);
    await expect(duplicate.json()).resolves.toEqual({ error: "job_already_exists" });
  });
});
