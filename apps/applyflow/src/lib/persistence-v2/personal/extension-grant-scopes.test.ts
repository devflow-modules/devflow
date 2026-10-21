import { describe, expect, it } from "vitest";

import {
  EXTENSION_GRANT_LEGACY_SCOPES,
  EXTENSION_GRANT_REQUESTABLE_SCOPES,
  grantHasScope,
  parseExtensionGrantScopes,
} from "./extension-grant-scopes";

describe("extension grant scopes", () => {
  it("keeps legacy set free of contacts", () => {
    expect(EXTENSION_GRANT_LEGACY_SCOPES).not.toContain("contacts:read");
    expect(EXTENSION_GRANT_LEGACY_SCOPES).not.toContain("contacts:write");
    expect(EXTENSION_GRANT_REQUESTABLE_SCOPES).toEqual([
      ...EXTENSION_GRANT_LEGACY_SCOPES,
      "contacts:read",
      "contacts:write",
    ]);
  });

  it("parses only known scopes and rejects unknowns", () => {
    expect(parseExtensionGrantScopes(["profile:read", "jobs:write"])).toEqual([
      "profile:read",
      "jobs:write",
    ]);
    expect(parseExtensionGrantScopes(["profile:read", "admin:*"])).toBeNull();
    expect(parseExtensionGrantScopes([])).toBeNull();
    expect(grantHasScope(["contacts:read"], "contacts:read")).toBe(true);
    expect(grantHasScope(EXTENSION_GRANT_LEGACY_SCOPES, "contacts:write")).toBe(false);
  });
});
