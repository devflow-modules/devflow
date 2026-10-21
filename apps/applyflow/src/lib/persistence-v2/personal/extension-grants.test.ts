import { describe, expect, it } from "vitest";

import {
  EXTENSION_GRANT_LEGACY_SCOPES,
  EXTENSION_GRANT_REQUESTABLE_SCOPES,
} from "./extension-grant-scopes";
import { createExtensionGrantService, createMemoryExtensionGrantStore } from "./extension-grants";

describe("extension grants", () => {
  it("binds a bearer token to one account and rejects it after logout revoke", async () => {
    const now = new Date("2026-10-05T12:00:00.000Z");
    const service = createExtensionGrantService(createMemoryExtensionGrantStore(), () => now);
    const minted = await service.mint("account-a", EXTENSION_GRANT_LEGACY_SCOPES);
    expect(minted.token).toMatch(/^[a-f0-9]{64}$/);
    expect(minted.scopes).toEqual([...EXTENSION_GRANT_LEGACY_SCOPES]);
    expect(await service.resolve(minted.token)).toEqual({
      accountId: "account-a",
      scopes: [...EXTENSION_GRANT_LEGACY_SCOPES],
    });
    expect(await service.resolve("not-the-token")).toBeNull();

    const other = await service.mint("account-b", EXTENSION_GRANT_REQUESTABLE_SCOPES);
    expect(other.scopes).toContain("contacts:read");
    expect(other.scopes).toContain("contacts:write");
    await service.revokeAccount("account-a");
    expect(await service.resolve(minted.token)).toBeNull();
    expect(await service.resolve(other.token)).toEqual({
      accountId: "account-b",
      scopes: [...EXTENSION_GRANT_REQUESTABLE_SCOPES],
    });
  });

  it("refuses mint without scopes and does not invent contacts on legacy set", async () => {
    const service = createExtensionGrantService(createMemoryExtensionGrantStore());
    await expect(service.mint("account-a", [])).rejects.toThrow(/scopes_required/);
    const legacy = await service.mint("account-a", EXTENSION_GRANT_LEGACY_SCOPES);
    expect(legacy.scopes).not.toContain("contacts:read");
    expect(legacy.scopes).not.toContain("contacts:write");
  });
});
