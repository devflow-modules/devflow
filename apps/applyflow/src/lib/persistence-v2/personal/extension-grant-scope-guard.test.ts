import { describe, expect, it, vi } from "vitest";

import { denyIfBearerLacksGrantScope } from "./extension-grant-scope-guard";

vi.mock("./extension-grants", () => ({
  applyFlowExtensionGrants: {
    resolve: vi.fn(),
  },
}));

import { applyFlowExtensionGrants } from "./extension-grants";

describe("denyIfBearerLacksGrantScope", () => {
  it("allows cookie session without checking grant scopes", async () => {
    const request = new Request("http://127.0.0.1:3010/api/applyflow/v2/contacts");
    expect(await denyIfBearerLacksGrantScope(request, "contacts:read")).toBeNull();
    expect(applyFlowExtensionGrants.resolve).not.toHaveBeenCalled();
  });

  it("denies bearer without contacts scope and allows when present", async () => {
    const resolve = vi.mocked(applyFlowExtensionGrants.resolve);
    resolve.mockResolvedValueOnce({
      accountId: "account-a",
      scopes: ["profile:read", "jobs:read", "applications:read"],
    });
    const denied = await denyIfBearerLacksGrantScope(
      new Request("http://127.0.0.1:3010/api/applyflow/v2/contacts", {
        headers: { Authorization: "Bearer legacy-token" },
      }),
      "contacts:read",
    );
    expect(denied?.status).toBe(403);
    expect(await denied?.json()).toEqual({
      error: "grant_capability_denied",
      scope: "contacts:read",
    });

    resolve.mockResolvedValueOnce({
      accountId: "account-a",
      scopes: ["contacts:read", "contacts:write"],
    });
    expect(
      await denyIfBearerLacksGrantScope(
        new Request("http://127.0.0.1:3010/api/applyflow/v2/contacts", {
          headers: { Authorization: "Bearer contacts-token" },
        }),
        "contacts:write",
      ),
    ).toBeNull();
  });
});
