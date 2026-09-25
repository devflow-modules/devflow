import { describe, expect, it, vi } from "vitest";

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

import { isApplyFlowPersistenceV2Enabled } from "@/lib/persistence-v2/feature-flag";
import {
  ApplyFlowAuthError,
  requireApplyFlowAccount,
} from "@/lib/persistence-v2/require-applyflow-account";
import { GET } from "./route";

describe("GET /api/applyflow/v2/me", () => {
  it("returns 404 when Persistence V2 is disabled", async () => {
    vi.mocked(isApplyFlowPersistenceV2Enabled).mockReturnValue(false);
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("returns 401 when enabled and unauthenticated", async () => {
    vi.mocked(isApplyFlowPersistenceV2Enabled).mockReturnValue(true);
    vi.mocked(requireApplyFlowAccount).mockRejectedValue(
      new ApplyFlowAuthError("unauthenticated", "Authentication required."),
    );
    const res = await GET();
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "unauthenticated" });
  });

  it("returns account when enabled and authenticated", async () => {
    vi.mocked(isApplyFlowPersistenceV2Enabled).mockReturnValue(true);
    vi.mocked(requireApplyFlowAccount).mockResolvedValue({
      id: "acc-1",
      authProviderSub: "sub-1",
      email: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ authenticated: true, account: { id: "acc-1" } });
  });
});
