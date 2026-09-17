import { describe, expect, it } from "vitest";

import { createResumeLibraryFromProfile, gustavoProfile } from "@devflow/applyflow-core";

import { resolveInboxMatchProfile } from "./resolve-inbox-match-profile";

describe("resolveInboxMatchProfile", () => {
  it("não cai num seed quando a biblioteca ainda não existe", () => {
    expect(resolveInboxMatchProfile(null)).toBeNull();
    expect(resolveInboxMatchProfile(undefined)).toBeNull();
    expect(resolveInboxMatchProfile({ library: null, status: "empty" } as never)).toBeNull();
  });

  it("usa a variante padrão da biblioteca carregada", () => {
    const library = createResumeLibraryFromProfile(gustavoProfile, {
      now: new Date("2026-09-09T12:00:00.000Z"),
    });
    expect(resolveInboxMatchProfile(library)?.name).toBe(gustavoProfile.name);
  });
});
