import { describe, expect, it, vi } from "vitest";

import { ApplyFlowAuthError } from "../require-applyflow-account";
import { resolveDashboardPersistenceBootstrap } from "./resolve-dashboard-persistence-bootstrap";

vi.mock("../require-applyflow-account", async () => {
  const actual = await vi.importActual<typeof import("../require-applyflow-account")>(
    "../require-applyflow-account",
  );
  return {
    ...actual,
    requireApplyFlowAccount: vi.fn(),
  };
});

vi.mock("../resolve-persistence-access", () => ({
  resolveApplyFlowPersistenceAccess: vi.fn(),
}));

import { requireApplyFlowAccount } from "../require-applyflow-account";
import { resolveApplyFlowPersistenceAccess } from "../resolve-persistence-access";

describe("resolveDashboardPersistenceBootstrap", () => {
  it("returns anonymous v1 when unauthenticated (no account create path leak)", async () => {
    vi.mocked(requireApplyFlowAccount).mockRejectedValueOnce(
      new ApplyFlowAuthError("unauthenticated", "Authentication required."),
    );
    const result = await resolveDashboardPersistenceBootstrap();
    expect(result).toEqual({
      ok: true,
      bootstrap: {
        mode: "v1",
        reason: "anonymous",
        canonicalPersistence: "v1_local",
        pilotEligible: false,
        accountId: null,
      },
    });
  });

  it("maps server access mode without reconstructing from flags in the client", async () => {
    vi.mocked(requireApplyFlowAccount).mockResolvedValueOnce({
      id: "acc_1",
      authProviderSub: "sub_1",
      email: "a@example.com",
      pilotEligible: true,
      canonicalPersistence: "v2_cloud",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(resolveApplyFlowPersistenceAccess).mockReturnValueOnce({
      mode: "v2_active",
      reason: "canonical_v2",
      canonicalPersistence: "v2_cloud",
    });
    const result = await resolveDashboardPersistenceBootstrap();
    expect(result).toEqual({
      ok: true,
      bootstrap: {
        mode: "v2_active",
        reason: "canonical_v2",
        canonicalPersistence: "v2_cloud",
        pilotEligible: true,
        accountId: "acc_1",
      },
    });
  });

  it("fails closed on unexpected errors (no silent V1)", async () => {
    vi.mocked(requireApplyFlowAccount).mockRejectedValueOnce(new Error("db_down"));
    const result = await resolveDashboardPersistenceBootstrap();
    expect(result).toEqual({ ok: false, code: "bootstrap_unavailable" });
  });
});
