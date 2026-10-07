import { describe, expect, it, vi, beforeEach } from "vitest";

const resolveGrant = vi.fn();
const findUnique = vi.fn();
const requireAccount = vi.fn();

vi.mock("../personal/extension-grants", () => ({
  applyFlowExtensionGrants: {
    resolve: (...args: unknown[]) => resolveGrant(...args),
  },
}));

vi.mock("../db", () => ({
  applyflowPrisma: {
    applyFlowAccount: {
      findUnique: (...args: unknown[]) => findUnique(...args),
    },
  },
}));

vi.mock("../require-applyflow-account", async () => {
  const actual = await vi.importActual<typeof import("../require-applyflow-account")>(
    "../require-applyflow-account",
  );
  return {
    ...actual,
    requireApplyFlowAccount: (...args: unknown[]) => requireAccount(...args),
  };
});

import { ApplyFlowAuthError } from "../require-applyflow-account";
import { resolveApplyFlowAccountFromRequest } from "./resolve-account-from-request";

describe("resolveApplyFlowAccountFromRequest", () => {
  beforeEach(() => {
    resolveGrant.mockReset();
    findUnique.mockReset();
    requireAccount.mockReset();
  });

  it("loads the account from a validated extension grant and ignores body accountId", async () => {
    resolveGrant.mockResolvedValue({ accountId: "account-from-grant" });
    findUnique.mockResolvedValue({
      id: "account-from-grant",
      authProviderSub: "sub",
      email: "a@example.test",
      pilotEligible: true,
      canonicalPersistence: "v2_cloud",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const request = new Request("http://127.0.0.1:3012/api/applyflow/v2/profile", {
      headers: {
        authorization: "Bearer tok",
        "content-type": "application/json",
      },
      method: "PUT",
      body: JSON.stringify({ accountId: "spoofed-account", library: {} }),
    });

    const account = await resolveApplyFlowAccountFromRequest(request);
    expect(account.id).toBe("account-from-grant");
    expect(requireAccount).not.toHaveBeenCalled();
    expect(resolveGrant).toHaveBeenCalledWith("tok");
  });

  it("rejects an invalid grant with unauthenticated", async () => {
    resolveGrant.mockResolvedValue(null);
    const request = new Request("http://127.0.0.1:3012/api/applyflow/v2/profile", {
      headers: { authorization: "Bearer bad" },
    });
    await expect(resolveApplyFlowAccountFromRequest(request)).rejects.toBeInstanceOf(ApplyFlowAuthError);
  });

  it("falls back to cookie session when no bearer is present", async () => {
    requireAccount.mockResolvedValue({ id: "cookie-account" });
    const account = await resolveApplyFlowAccountFromRequest(
      new Request("http://127.0.0.1:3012/api/applyflow/v2/profile"),
    );
    expect(account.id).toBe("cookie-account");
  });
});
