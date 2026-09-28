import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedApplyFlowUser = vi.fn();
const upsert = vi.fn();

vi.mock("./auth/get-authenticated-user", () => ({
  getAuthenticatedApplyFlowUser,
  ApplyFlowAuthError: class ApplyFlowAuthError extends Error {
    code: "unauthenticated" | "auth_not_configured";
    constructor(code: "unauthenticated" | "auth_not_configured", message: string) {
      super(message);
      this.code = code;
    }
  },
}));

vi.mock("./db", () => ({
  applyflowPrisma: {
    applyFlowAccount: {
      upsert,
    },
  },
}));

describe("requireApplyFlowAccount", () => {
  beforeEach(() => {
    vi.resetModules();
    getAuthenticatedApplyFlowUser.mockReset();
    upsert.mockReset();
    delete process.env.APPLYFLOW_PERSISTENCE_V2;
  });

  it("provisions an account when Persistence V2 GLOBAL is disabled", async () => {
    process.env.APPLYFLOW_PERSISTENCE_V2 = "false";
    getAuthenticatedApplyFlowUser.mockResolvedValue({
      authProviderSub: "sub-off",
      email: "off@example.com",
    });
    upsert.mockResolvedValue({
      id: "acc-off",
      authProviderSub: "sub-off",
      email: "off@example.com",
      pilotEligible: false,
      canonicalPersistence: "v1_local",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const { requireApplyFlowAccount } = await import("./require-applyflow-account");
    const account = await requireApplyFlowAccount();
    expect(account.id).toBe("acc-off");
    expect(account.pilotEligible).toBe(false);
    expect(account.canonicalPersistence).toBe("v1_local");
  });

  it("creates account idempotently for authenticated user with safe defaults", async () => {
    process.env.APPLYFLOW_PERSISTENCE_V2 = "true";
    getAuthenticatedApplyFlowUser.mockResolvedValue({
      authProviderSub: "sub-123",
      email: "user@example.com",
    });
    upsert.mockResolvedValue({
      id: "acc-1",
      authProviderSub: "sub-123",
      email: "user@example.com",
      pilotEligible: false,
      canonicalPersistence: "v1_local",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const { requireApplyFlowAccount } = await import("./require-applyflow-account");
    const first = await requireApplyFlowAccount();
    expect(first.pilotEligible).toBe(false);
    expect(first.canonicalPersistence).toBe("v1_local");
    expect(upsert.mock.calls[0][0].update).not.toHaveProperty("pilotEligible");
    expect(upsert.mock.calls[0][0].update).not.toHaveProperty("canonicalPersistence");
  });

  it("preserves existing pilotEligible and canonicalPersistence on upsert update", async () => {
    getAuthenticatedApplyFlowUser.mockResolvedValue({
      authProviderSub: "sub-pilot",
      email: "pilot@example.com",
    });
    upsert.mockResolvedValue({
      id: "acc-pilot",
      authProviderSub: "sub-pilot",
      email: "pilot@example.com",
      pilotEligible: true,
      canonicalPersistence: "v2_cloud",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    });

    const { requireApplyFlowAccount } = await import("./require-applyflow-account");
    const account = await requireApplyFlowAccount();
    expect(account.pilotEligible).toBe(true);
    expect(account.canonicalPersistence).toBe("v2_cloud");
  });

  it("propagates unauthenticated errors", async () => {
    const { ApplyFlowAuthError } = await import("./auth/get-authenticated-user");
    getAuthenticatedApplyFlowUser.mockRejectedValue(
      new ApplyFlowAuthError("unauthenticated", "Authentication required."),
    );
    const { requireApplyFlowAccount } = await import("./require-applyflow-account");
    await expect(requireApplyFlowAccount()).rejects.toMatchObject({ code: "unauthenticated" });
    expect(upsert).not.toHaveBeenCalled();
  });
});
