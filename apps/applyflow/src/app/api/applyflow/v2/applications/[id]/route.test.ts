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

import { isApplyFlowPersistenceV2Enabled } from "@/lib/persistence-v2/feature-flag";
import { ApplyFlowApplicationServiceError } from "@/lib/persistence-v2/applications/application-errors";
import { applyFlowApplicationService } from "@/lib/persistence-v2/applications/application-service";
import { requireApplyFlowAccount } from "@/lib/persistence-v2/require-applyflow-account";
import { GET, PATCH } from "./route";

const account = {
  id: "account-server",
  authProviderSub: "sub-1",
  email: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const application = {
  id: "app_client",
  sourceJobId: "job_1",
  source: "paste",
  status: "applied",
  jobTitle: "Role",
  companyName: null,
  jobUrl: null,
  fitScore: null,
  notes: null,
  jobMeta: null,
  v2Meta: null,
  extras: null,
  appliedAt: "2026-09-25T15:00:00.000Z",
  version: 2,
  createdAt: "2026-09-25T15:00:00.000Z",
  updatedAt: "2026-09-25T15:01:00.000Z",
};

const context = { params: Promise.resolve({ id: "app_client" }) };

function patchRequest(body: unknown, ifMatch: string | null) {
  const headers = new Headers({ "content-type": "application/json" });
  if (ifMatch != null) headers.set("if-match", ifMatch);
  return new Request("http://localhost/api/applyflow/v2/applications/app_client", {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
}

describe("Application item routes", () => {
  beforeEach(() => {
    vi.mocked(isApplyFlowPersistenceV2Enabled).mockReturnValue(true);
    vi.mocked(requireApplyFlowAccount).mockResolvedValue(account);
    vi.mocked(applyFlowApplicationService.get).mockReset();
    vi.mocked(applyFlowApplicationService.patch).mockReset();
  });

  it("returns the application for the server account", async () => {
    vi.mocked(applyFlowApplicationService.get).mockResolvedValue(application);
    const response = await GET(new Request("http://localhost/api/applyflow/v2/applications/app_client"), context);
    expect(response.status).toBe(200);
    expect(response.headers.get("ETag")).toBe('"2"');
    expect(applyFlowApplicationService.get).toHaveBeenCalledWith("account-server", "app_client");
  });

  it("returns 404 when the application is missing", async () => {
    vi.mocked(applyFlowApplicationService.get).mockRejectedValue(new ApplyFlowApplicationServiceError("not_found"));
    const response = await GET(new Request("http://localhost/api/applyflow/v2/applications/app_client"), context);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "not_found" });
  });

  it("patches with If-Match and maps stale and missing results", async () => {
    vi.mocked(applyFlowApplicationService.patch).mockResolvedValueOnce(application);
    const ok = await PATCH(patchRequest({ notes: "next" }, '"1"'), context);
    expect(ok.status).toBe(200);
    expect(ok.headers.get("ETag")).toBe('"2"');

    vi.mocked(applyFlowApplicationService.patch).mockRejectedValueOnce(
      new ApplyFlowApplicationServiceError("version_conflict"),
    );
    const stale = await PATCH(patchRequest({ notes: "stale" }, '"1"'), context);
    expect(stale.status).toBe(409);

    vi.mocked(applyFlowApplicationService.patch).mockRejectedValueOnce(new ApplyFlowApplicationServiceError("not_found"));
    const missing = await PATCH(patchRequest({ notes: "missing" }, '"1"'), context);
    expect(missing.status).toBe(404);
  });

  it("returns 400 for an empty patch, an immutable id, and a bad If-Match", async () => {
    const empty = await PATCH(patchRequest({}, '"1"'), context);
    expect(empty.status).toBe(400);
    await expect(empty.json()).resolves.toEqual({ error: "empty_patch" });

    const identity = await PATCH(patchRequest({ id: "app_other", notes: "x" }, '"1"'), context);
    expect(identity.status).toBe(400);
    await expect(identity.json()).resolves.toEqual({ error: "invalid_payload" });

    const header = await PATCH(patchRequest({ notes: "x" }, "1"), context);
    expect(header.status).toBe(400);
    await expect(header.json()).resolves.toEqual({ error: "invalid_if_match" });
    expect(applyFlowApplicationService.patch).not.toHaveBeenCalled();
  });

  it("maps an illegal status transition", async () => {
    vi.mocked(applyFlowApplicationService.patch).mockRejectedValue(
      new ApplyFlowApplicationServiceError("invalid_status_transition"),
    );
    const response = await PATCH(patchRequest({ status: "interview" }, '"1"'), context);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_status_transition" });
  });
});
