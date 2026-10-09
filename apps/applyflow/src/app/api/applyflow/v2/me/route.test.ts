import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/persistence-v2/require-applyflow-account", () => {
  class ApplyFlowAuthError extends Error {
    code: "unauthenticated" | "auth_not_configured";
    constructor(code: "unauthenticated" | "auth_not_configured", message: string) {
      super(message);
      this.code = code;
    }
  }
  return {
    requireApplyFlowAccount: vi.fn(),
    ApplyFlowAuthError,
  };
});

vi.mock("@/lib/persistence-v2/feature-flag", () => ({
  isApplyFlowPersistenceV2Enabled: vi.fn(),
}));

import { isApplyFlowPersistenceV2Enabled } from "@/lib/persistence-v2/feature-flag";
import {
  ApplyFlowAuthError,
  requireApplyFlowAccount,
} from "@/lib/persistence-v2/require-applyflow-account";
import { GET } from "./route";

function account(overrides: Record<string, unknown> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    authProviderSub: "sub-1",
    email: null,
    pilotEligible: false,
    canonicalPersistence: "v1_local" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("GET /api/applyflow/v2/me", () => {
  beforeEach(() => {
    process.env.APPLYFLOW_PERSISTENCE_V2_ROLLOUT_ACCOUNTS = "11111111-1111-4111-8111-111111111111";
    vi.mocked(requireApplyFlowAccount).mockReset();
    vi.mocked(isApplyFlowPersistenceV2Enabled).mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireApplyFlowAccount).mockRejectedValue(
      new ApplyFlowAuthError("unauthenticated", "Authentication required."),
    );
    const res = await GET();
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "unauthenticated" });
  });

  it("provisions with GLOBAL=false and returns mode v1", async () => {
    vi.mocked(isApplyFlowPersistenceV2Enabled).mockReturnValue(false);
    vi.mocked(requireApplyFlowAccount).mockResolvedValue(account());
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      authenticated: true,
      account: { id: "11111111-1111-4111-8111-111111111111" },
      persistence: {
        mode: "v1",
        reason: "global_disabled",
        pilotEligible: false,
        canonicalPersistence: "v1_local",
      },
    });
  });

  it("GLOBAL=false + pilot true + v1_local → mode v1", async () => {
    vi.mocked(isApplyFlowPersistenceV2Enabled).mockReturnValue(false);
    vi.mocked(requireApplyFlowAccount).mockResolvedValue(
      account({ pilotEligible: true, canonicalPersistence: "v1_local" }),
    );
    const body = await (await GET()).json();
    expect(body.persistence.mode).toBe("v1");
  });

  it("GLOBAL=true + pilot false + v1_local → mode v1", async () => {
    vi.mocked(isApplyFlowPersistenceV2Enabled).mockReturnValue(true);
    vi.mocked(requireApplyFlowAccount).mockResolvedValue(account());
    const body = await (await GET()).json();
    expect(body.persistence).toEqual({
      mode: "v1",
      reason: "not_eligible",
      pilotEligible: false,
      canonicalPersistence: "v1_local",
    });
  });

  it("GLOBAL=true + pilot true + v1_local → v2_offering", async () => {
    vi.mocked(isApplyFlowPersistenceV2Enabled).mockReturnValue(true);
    vi.mocked(requireApplyFlowAccount).mockResolvedValue(
      account({ pilotEligible: true, canonicalPersistence: "v1_local" }),
    );
    const body = await (await GET()).json();
    expect(body.persistence.mode).toBe("v2_offering");
  });

  it("GLOBAL=false + v2_cloud → v2_paused", async () => {
    vi.mocked(isApplyFlowPersistenceV2Enabled).mockReturnValue(false);
    vi.mocked(requireApplyFlowAccount).mockResolvedValue(
      account({ pilotEligible: true, canonicalPersistence: "v2_cloud" }),
    );
    const body = await (await GET()).json();
    expect(body.persistence.mode).toBe("v2_paused");
  });

  it("GLOBAL=true + pilot false + v2_cloud → v2_read_only", async () => {
    vi.mocked(isApplyFlowPersistenceV2Enabled).mockReturnValue(true);
    vi.mocked(requireApplyFlowAccount).mockResolvedValue(
      account({ pilotEligible: false, canonicalPersistence: "v2_cloud" }),
    );
    const body = await (await GET()).json();
    expect(body.persistence.mode).toBe("v2_read_only");
  });

  it("GLOBAL=true + pilot true + v2_cloud → v2_active", async () => {
    vi.mocked(isApplyFlowPersistenceV2Enabled).mockReturnValue(true);
    vi.mocked(requireApplyFlowAccount).mockResolvedValue(
      account({ pilotEligible: true, canonicalPersistence: "v2_cloud" }),
    );
    const body = await (await GET()).json();
    expect(body.persistence.mode).toBe("v2_active");
  });
});
