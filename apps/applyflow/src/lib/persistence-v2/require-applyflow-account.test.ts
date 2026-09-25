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

  it("throws when Persistence V2 is disabled", async () => {
    const { requireApplyFlowAccount, ApplyFlowPersistenceDisabledError } = await import(
      "./require-applyflow-account"
    );
    await expect(requireApplyFlowAccount()).rejects.toBeInstanceOf(ApplyFlowPersistenceDisabledError);
  });

  it("creates account idempotently for authenticated user", async () => {
    process.env.APPLYFLOW_PERSISTENCE_V2 = "true";
    getAuthenticatedApplyFlowUser.mockResolvedValue({
      authProviderSub: "sub-123",
      email: "user@example.com",
    });
    upsert.mockResolvedValue({
      id: "acc-1",
      authProviderSub: "sub-123",
      email: "user@example.com",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const { requireApplyFlowAccount } = await import("./require-applyflow-account");
    const first = await requireApplyFlowAccount();
    const second = await requireApplyFlowAccount();
    expect(first.id).toBe("acc-1");
    expect(second.id).toBe("acc-1");
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { authProviderSub: "sub-123" },
        create: { authProviderSub: "sub-123", email: "user@example.com" },
      }),
    );
    expect(upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { authProviderSub: "sub-123" },
      }),
    );
  });

  it("propagates unauthenticated errors", async () => {
    process.env.APPLYFLOW_PERSISTENCE_V2 = "true";
    const { ApplyFlowAuthError } = await import("./auth/get-authenticated-user");
    getAuthenticatedApplyFlowUser.mockRejectedValue(
      new ApplyFlowAuthError("unauthenticated", "Authentication required."),
    );
    const { requireApplyFlowAccount } = await import("./require-applyflow-account");
    await expect(requireApplyFlowAccount()).rejects.toMatchObject({ code: "unauthenticated" });
  });
});
