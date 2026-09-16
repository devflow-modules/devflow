import { describe, expect, it } from "vitest";

import { candidateProfileFromDraft, draftFromCandidateProfile, emptyCandidateProfileDraft } from "../profile-draft.js";
import { validateCandidateProfile } from "../profile-schema.js";

describe("candidateProfileFromDraft", () => {
  it("grava o mínimo sem inventar salário, inglês ou anos", () => {
    const draft = emptyCandidateProfileDraft();
    draft.name = "Ana Costa";
    draft.role = "Product Engineer";
    draft.skills.React = { selected: true, years: "" };
    const profile = candidateProfileFromDraft(draft);
    expect(profile.name).toBe("Ana Costa");
    expect(profile.roles).toEqual(["Product Engineer"]);
    expect(profile.skills.React).toBeNull();
    expect(profile.englishLevel).toBeUndefined();
    expect(profile.comfortableInEnglish).toBeUndefined();
    expect(profile.salary).toEqual({});
    expect(profile.location).toBeUndefined();
    expect(profile.evidence).toBeUndefined();
  });

  it("recusa gravar sem cargo", () => {
    const draft = emptyCandidateProfileDraft();
    draft.name = "Ana Costa";
    expect(() => candidateProfileFromDraft(draft)).toThrow(/cargo ou área/i);
  });

  it("round-trip preserva zero, unknown e não", () => {
    const profile = validateCandidateProfile({
      name: "Ana Costa",
      roles: ["Engineer"],
      comfortableInEnglish: false,
      skills: { React: 0, TypeScript: null },
    });
    const again = candidateProfileFromDraft(draftFromCandidateProfile(profile));
    expect(again.comfortableInEnglish).toBe(false);
    expect(again.skills.React).toBe(0);
    expect(again.skills.TypeScript).toBeNull();
    expect(again.skills.Python).toBeUndefined();
  });
});
