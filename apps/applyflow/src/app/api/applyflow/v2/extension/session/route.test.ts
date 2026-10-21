import { beforeEach, describe, expect, it, vi } from "vitest";

const { mint } = vi.hoisted(() => ({ mint: vi.fn() }));

vi.mock("@/lib/http/same-origin-guard", () => ({
  enforceSameOriginMutatingRequest: vi.fn(() => null),
}));

vi.mock("@/lib/persistence-v2/auth/resolve-account-from-request", () => ({
  resolveApplyFlowAccountFromRequest: vi.fn(),
}));

vi.mock("@/lib/persistence-v2/require-applyflow-account", () => {
  class ApplyFlowAuthError extends Error {}
  return {
    requireApplyFlowAccount: vi.fn(async () => ({
      id: "11111111-1111-4111-8111-111111111111",
    })),
    ApplyFlowAuthError,
  };
});

vi.mock("@/lib/persistence-v2/http-access", () => ({
  applyFlowAuthErrorResponse: vi.fn(() => null),
  applyFlowV2HttpAccessErrorResponse: vi.fn(() => null),
  assertApplyFlowExtensionGrantMint: vi.fn(),
}));

vi.mock("@/lib/persistence-v2/resolve-persistence-access", () => ({
  resolveApplyFlowPersistenceAccess: vi.fn(() => ({ mode: "v2_active" })),
}));

vi.mock("@/lib/persistence-v2/personal/extension-grants", () => ({
  applyFlowExtensionGrants: { mint },
}));

import { EXTENSION_GRANT_LEGACY_SCOPES } from "@/lib/persistence-v2/personal/extension-grant-scopes";
import { POST } from "./route";

describe("POST /api/applyflow/v2/extension/session", () => {
  beforeEach(() => {
    mint.mockReset();
  });

  it("rejects a scope outside the requestable catalog and does not mint", async () => {
    const response = await POST(
      new Request("http://127.0.0.1/api/applyflow/v2/extension/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scopes: ["contacts:admin", "profile:read"] }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "scopes_required" });
    expect(mint).not.toHaveBeenCalled();
  });

  it("mints only the confirmed legacy scope list", async () => {
    mint.mockResolvedValue({
      accountId: "11111111-1111-4111-8111-111111111111",
      token: "opaque-token",
      expiresAt: "2026-10-28T00:00:00.000Z",
      scopes: [...EXTENSION_GRANT_LEGACY_SCOPES],
    });

    const response = await POST(
      new Request("http://127.0.0.1/api/applyflow/v2/extension/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scopes: [...EXTENSION_GRANT_LEGACY_SCOPES] }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mint).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      [...EXTENSION_GRANT_LEGACY_SCOPES],
    );
    const body = (await response.json()) as { scopes: string[]; token: string };
    expect(body.scopes).toEqual([...EXTENSION_GRANT_LEGACY_SCOPES]);
    expect(body.scopes).not.toContain("contacts:read");
    expect(body.token).toBe("opaque-token");
  });
});
