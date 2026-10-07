import { describe, expect, it } from "vitest";

import {
  EXTENSION_LEGACY_PROFILE_KEY,
  extensionAccountProfileKey,
  readExtensionAccount,
  selectExtensionProfileKey,
} from "./extension-account-client";

describe("extension account client", () => {
  it("uses the bearer for the signed-in account and clears access when the session is gone", async () => {
    const fetchImpl = async (_url: unknown, init?: { headers?: { Authorization?: string } }) => {
      const header = init?.headers?.Authorization ?? "";
      if (header === "Bearer token-a") {
        return new Response(JSON.stringify({ accountId: "account-a", autoSubmit: false }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401 });
    };
    const active = await readExtensionAccount({
      origin: "http://127.0.0.1:3010",
      token: "token-a",
      fetchImpl: fetchImpl as typeof fetch,
    });
    expect(active).toEqual({ ok: true, accountId: "account-a" });
    const signedOut = await readExtensionAccount({
      origin: "http://127.0.0.1:3010",
      token: "token-a-revoked",
      fetchImpl: fetchImpl as typeof fetch,
    });
    expect(signedOut).toEqual({ ok: false, reason: "signed_out" });
  });

  it("does not reuse the legacy profile key for an authenticated account", () => {
    expect(selectExtensionProfileKey({ accountId: "account-a" })).toBe(extensionAccountProfileKey("account-a"));
    expect(selectExtensionProfileKey({ accountId: "account-a" })).not.toBe(EXTENSION_LEGACY_PROFILE_KEY);
    expect(selectExtensionProfileKey({ accountId: null })).toBeNull();
    expect(selectExtensionProfileKey({ accountId: "account-b" })).not.toBe(
      selectExtensionProfileKey({ accountId: "account-a" }),
    );
  });
});
