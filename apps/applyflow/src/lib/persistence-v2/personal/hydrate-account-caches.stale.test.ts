import { afterEach, describe, expect, it, vi } from "vitest";

import {
  bindPersonalClientScope,
  resetPersonalClientScopeForTests,
} from "./client-scope";
import { hydrateAccountPersonalCaches } from "./hydrate-account-caches";

afterEach(() => {
  resetPersonalClientScopeForTests();
  vi.unstubAllGlobals();
});

describe("hydrateAccountPersonalCaches generation fence", () => {
  it("ignores a delayed account A payload after switching to account B", async () => {
    const accountA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const accountB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const generationA = bindPersonalClientScope({ accountId: accountA, authority: "cloud_write" });

    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        await gate;
        return new Response(
          JSON.stringify({
            profile: { library: { version: 1, defaultVariantId: "x", variants: [{ name: "Conta A" }] } },
            contacts: [{ id: "c-a", name: "Contact A Only" }],
            interactions: [],
            versions: {},
            responses: [],
            events: [],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }),
    );

    const storage = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        setItem: (key: string, value: string) => storage.set(key, value),
        getItem: (key: string) => storage.get(key) ?? null,
        removeItem: (key: string) => storage.delete(key),
      },
    });

    const pending = hydrateAccountPersonalCaches(generationA);
    bindPersonalClientScope({ accountId: accountB, authority: "cloud_write" });
    release();
    await expect(pending).resolves.toBe(false);
    expect([...storage.keys()].some((key) => key.includes(accountB) && storage.get(key)?.includes("Conta A"))).toBe(
      false,
    );
    expect([...storage.keys()].some((key) => key.includes(accountA))).toBe(false);
  });
});
