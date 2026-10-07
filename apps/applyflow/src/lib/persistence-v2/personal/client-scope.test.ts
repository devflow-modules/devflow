import { afterEach, describe, expect, it } from "vitest";

import { APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY } from "@/lib/local-resume-library-storage";

import {
  acceptPersonalResult,
  beginPersonalRequest,
  bindPersonalClientScope,
  personalLocalWritesAllowed,
  personalStorageKey,
  rememberedContactVersion,
  rememberedResponseVersions,
  rememberContactVersion,
  rememberResponseVersion,
  resetPersonalClientScopeForTests,
} from "./client-scope";

const ACCOUNT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ACCOUNT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

afterEach(() => {
  resetPersonalClientScopeForTests();
});

describe("personal client scope", () => {
  it("keeps legacy keys for local mode and scopes cloud caches by account", () => {
    expect(personalStorageKey(APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY)).toBe(APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY);
    bindPersonalClientScope({ accountId: ACCOUNT_A, authority: "cloud_write" });
    expect(personalStorageKey(APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY)).toBe(
      `${APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY}::${ACCOUNT_A}`,
    );
    bindPersonalClientScope({ accountId: ACCOUNT_B, authority: "cloud_write" });
    expect(personalStorageKey(APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY)).not.toContain(ACCOUNT_A);
  });

  it("drops a late result from account A after switching to account B", () => {
    const generationA = bindPersonalClientScope({ accountId: ACCOUNT_A, authority: "cloud_write" });
    const request = beginPersonalRequest();
    bindPersonalClientScope({ accountId: ACCOUNT_B, authority: "cloud_write" });
    expect(request.signal.aborted).toBe(true);
    expect(acceptPersonalResult(generationA, { profile: "A" })).toBeNull();
    expect(acceptPersonalResult(request.generation, { profile: "A" })).toBeNull();
  });

  it("does not allow cloud mode to write the local authority", () => {
    bindPersonalClientScope({ accountId: ACCOUNT_A, authority: "cloud_write" });
    expect(personalLocalWritesAllowed()).toBe(false);
    bindPersonalClientScope({ accountId: null, authority: "cloud_paused" });
    expect(personalLocalWritesAllowed()).toBe(false);
    bindPersonalClientScope({ accountId: null, authority: "local" });
    expect(personalLocalWritesAllowed()).toBe(true);
  });

  it("forgets contact and response versions when the account changes", () => {
    bindPersonalClientScope({ accountId: ACCOUNT_A, authority: "cloud_write" });
    rememberContactVersion("contact-1", 3);
    rememberResponseVersion("response-1", 2);
    expect(rememberedContactVersion("contact-1")).toBe(3);
    expect(rememberedResponseVersions()).toEqual({ "response-1": 2 });
    bindPersonalClientScope({ accountId: ACCOUNT_B, authority: "cloud_write" });
    expect(rememberedContactVersion("contact-1")).toBeUndefined();
    expect(rememberedResponseVersions()).toEqual({});
  });
});
