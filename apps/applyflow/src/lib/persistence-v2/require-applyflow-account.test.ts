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
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { authProviderSub: "sub-off" },
        create: expect.objectContaining({
          authProviderSub: "sub-off",
          email: "off@example.com",
          pilotEligible: false,
          canonicalPersistence: "v1_local",
        }),
        update: { email: "off@example.com" },
      }),
    );
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
    const second = await requireApplyFlowAccount();
    expect(first.id).toBe("acc-1");
    expect(second.id).toBe("acc-1");
    expect(first.pilotEligible).toBe(false);
    expect(first.canonicalPersistence).toBe("v1_local");
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert.mock.calls[0][0].create).toEqual({
      authProviderSub: "sub-123",
      email: "user@example.com",
      pilotEligible: false,
      canonicalPersistence: "v1_local",
    });
    expect(upsert.mock.calls[0][0].update).not.toHaveProperty("pilotEligible");
    expect(upsert.mock.calls[0][0].update).not.toHaveProperty("canonicalPersistence");
  });

  it("preserves existing pilotEligible and canonicalPersistence on upsert update", async () => {
    process.env.APPLYFLOW_PERSISTENCE_V2 = "false";
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
    expect(upsert.mock.calls[0][0].update).toEqual({ email: "pilot@example.com" });
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

describe("assertApplyFlowPersistenceV2GloballyEnabled", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.APPLYFLOW_PERSISTENCE_V2;
  });

  it("throws when GLOBAL is off (temporary fail-closed compatibility)", async () => {
    process.env.APPLYFLOW_PERSISTENCE_V2 = "false";
    const { assertApplyFlowPersistenceV2GloballyEnabled, ApplyFlowPersistenceDisabledError } =
      await import("./require-applyflow-account");
    expect(() => assertApplyFlowPersistenceV2GloballyEnabled()).toThrow(
      ApplyFlowPersistenceDisabledError,
    );
  });

  it("allows when GLOBAL is on", async () => {
    process.env.APPLYFLOW_PERSISTENCE_V2 = "true";
    const { assertApplyFlowPersistenceV2GloballyEnabled } = await import(
      "./require-applyflow-account"
    );
    expect(() => assertApplyFlowPersistenceV2GloballyEnabled()).not.toThrow();
  });
});
