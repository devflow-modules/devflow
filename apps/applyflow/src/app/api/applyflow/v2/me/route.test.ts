import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/persistence-v2/feature-flag", () => ({
  isApplyFlowPersistenceV2Enabled: vi.fn(),
}));

vi.mock("@/lib/persistence-v2/require-applyflow-account", () => ({
  requireApplyFlowAccount: vi.fn(),
}));

import { isApplyFlowPersistenceV2Enabled } from "@/lib/persistence-v2/feature-flag";
import { requireApplyFlowAccount } from "@/lib/persistence-v2/require-applyflow-account";
import { GET } from "./route";

describe("GET /api/applyflow/v2/me", () => {
  it("returns 404 when Persistence V2 is disabled", async () => {
    vi.mocked(isApplyFlowPersistenceV2Enabled).mockReturnValue(false);
    const res = await GET();
    expect(res.status).toBe(404);
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
