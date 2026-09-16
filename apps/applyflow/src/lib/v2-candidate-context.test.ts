import { describe, expect, it, vi, afterEach } from "vitest";

import { buildRecordedFact, createResumeLibraryFromProfile, gustavoProfile, validateCandidateProfile } from "@devflow/applyflow-core";

import { APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY, persistResumeLibrary } from "./local-resume-library-storage";
import { evidenceExtrasForCandidate, resolveV2CandidateContext } from "./v2-candidate-context";

function stubStorage(initial?: Record<string, string>) {
  const storage: Record<string, string> = { ...initial };
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => (k in storage ? storage[k]! : null),
      setItem: (k: string, v: string) => {
        storage[k] = v;
      },
      removeItem: (k: string) => {
        delete storage[k];
      },
    },
  } as Window & typeof globalThis);
  return storage;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const otherProfile = validateCandidateProfile({
  ...gustavoProfile,
  name: "Ana Costa",
  location: "Portugal",
  roles: ["Frontend Engineer"],
});

describe("v2-candidate-context", () => {
  it("não injeta seed pessoal por coincidência de nome ou cargo", () => {
    expect(evidenceExtrasForCandidate(gustavoProfile)).toEqual([]);
    expect(evidenceExtrasForCandidate(otherProfile)).toEqual([]);
  });

  it("usa só evidências gravadas no perfil", () => {
    const fact = buildRecordedFact({
      id: "fact_stored",
      kind: "skill_component",
      topic: "supabase.database",
      label: "Supabase Database",
      origin: "candidate_declaration",
    });
    const withFact = validateCandidateProfile({ ...otherProfile, evidence: [fact] });
    expect(evidenceExtrasForCandidate(withFact).map((item) => item.id)).toEqual(["fact_stored"]);
  });

  it("sem biblioteca não inventa gustavoProfile", () => {
    stubStorage();
    expect(resolveV2CandidateContext()).toEqual({ ok: false });
  });

  it("com biblioteca devolve perfil, library e evidências do candidato", () => {
    stubStorage();
    persistResumeLibrary(
      createResumeLibraryFromProfile(otherProfile, { now: new Date("2026-09-09T12:00:00.000Z"), id: "rv_ana" }),
    );
    const ctx = resolveV2CandidateContext();
    expect(ctx.ok).toBe(true);
    if (!ctx.ok) return;
    expect(ctx.profile.name).toBe("Ana Costa");
    expect(ctx.library.defaultVariantId).toBe("rv_ana");
    expect(ctx.evidence.some((item) => item.id.startsWith("seed-"))).toBe(false);
    expect(window.localStorage.getItem(APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY)).toBeTruthy();
  });
});
