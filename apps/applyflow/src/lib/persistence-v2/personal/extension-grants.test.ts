import { describe, expect, it } from "vitest";

import { createExtensionGrantService, createMemoryExtensionGrantStore } from "./extension-grants";

describe("extension grants", () => {
  it("binds a bearer token to one account and rejects it after logout revoke", async () => {
    const now = new Date("2026-10-05T12:00:00.000Z");
    const service = createExtensionGrantService(createMemoryExtensionGrantStore(), () => now);
    const minted = await service.mint("account-a");
    expect(minted.token).toMatch(/^[a-f0-9]{64}$/);
    expect(await service.resolve(minted.token)).toEqual({ accountId: "account-a" });
    expect(await service.resolve("not-the-token")).toBeNull();

    const other = await service.mint("account-b");
    await service.revokeAccount("account-a");
    expect(await service.resolve(minted.token)).toBeNull();
    expect(await service.resolve(other.token)).toEqual({ accountId: "account-b" });
  });
});
