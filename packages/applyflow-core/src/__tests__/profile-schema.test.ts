import { describe, expect, it } from "vitest";
import { getSuggestedAnswer } from "../answer-rules.js";
import { gustavoProfile } from "../candidate-profile.js";
import type { CandidateProfile } from "../profile-schema.js";
import { APPLYFLOW_SKILL_KEYS, validateCandidateProfile } from "../profile-schema.js";

describe("validateCandidateProfile", () => {
  it("aceita objeto mínimo com skills parciais e normaliza chaves", () => {
    const p = validateCandidateProfile({
      name: "Dev Test",
      location: "Remote",
      englishLevel: "Fluent",
      comfortableInEnglish: true,
      roles: ["Engineer"],
      skills: { react: 7, nextjs: 2 },
      salary: {
        cltPleno: "R$ 1",
        cltSenior: "R$ 2",
        pjSenior: "R$ 3",
        usdMonthly: "USD 1",
        usdHourly: "USD 1",
      },
    });
    expect(p.skills.React).toBe(7);
    expect(p.skills.Nextjs).toBe(2);
    expect(APPLYFLOW_SKILL_KEYS.every((k) => typeof p.skills[k] === "number")).toBe(true);
    expect(p.answerBank).toEqual({
      professionalSummary: "",
      tellUsAboutYourself: "",
      whyGoodFit: "",
      availability: "",
    });
  });

  it("rejeita englishLevel inválido", () => {
    expect(() =>
      validateCandidateProfile({
        name: "X",
        location: "Y",
        englishLevel: "Alien",
        comfortableInEnglish: false,
        roles: [],
        skills: {},
        salary: {
          cltPleno: "a",
          cltSenior: "b",
          pjSenior: "c",
          usdMonthly: "d",
          usdHourly: "e",
        },
      }),
    ).toThrow();
  });

  it("aceita answerBank parcial e preenche omissões com vazio", () => {
    const p = validateCandidateProfile({
      name: "Dev Test",
      location: "Remote",
      englishLevel: "Fluent",
      comfortableInEnglish: true,
      roles: ["Engineer"],
      skills: { react: 7, nextjs: 2 },
      salary: {
        cltPleno: "R$ 1",
        cltSenior: "R$ 2",
        pjSenior: "R$ 3",
        usdMonthly: "USD 1",
        usdHourly: "USD 1",
      },
      answerBank: {
        tellUsAboutYourself: "  Hello  ",
      },
    });
    expect(p.answerBank.tellUsAboutYourself).toBe("Hello");
    expect(p.answerBank.professionalSummary).toBe("");
    expect(p.answerBank.whyGoodFit).toBe("");
    expect(p.answerBank.availability).toBe("");
  });

  it("rejeita texto acima do limite em answerBank", () => {
    const big = "x".repeat(5001);
    expect(() =>
      validateCandidateProfile({
        name: "Dev Test",
        location: "Remote",
        englishLevel: "Fluent",
        comfortableInEnglish: true,
        roles: ["Engineer"],
        skills: { react: 1 },
        salary: {
          cltPleno: "R$ 1",
          cltSenior: "R$ 2",
          pjSenior: "R$ 3",
          usdMonthly: "USD 1",
          usdHourly: "USD 1",
        },
        answerBank: { professionalSummary: big },
      }),
    ).toThrow(/professionalSummary/);
  });

  it("export JSON → parse preserva answerBank", () => {
    const p = validateCandidateProfile(JSON.parse(JSON.stringify(gustavoProfile)) as unknown);
    expect(p.answerBank.tellUsAboutYourself).toBe(gustavoProfile.answerBank.tellUsAboutYourself);
    expect(p.answerBank.professionalSummary).toContain("DevFlow Labs");
  });
});

describe("getSuggestedAnswer com perfil customizado", () => {
  it("React usa anos do perfil (ex.: 7)", () => {
    const custom: CandidateProfile = {
      ...gustavoProfile,
      skills: { ...gustavoProfile.skills, React: 7 },
    };
    const r = getSuggestedAnswer("How many years of experience do you have with React?", custom);
    expect(r.value).toBe("7");
  });

  it("sem perfil explícito usa gustavoProfile (fallback)", () => {
    const r = getSuggestedAnswer("How many years of experience do you have with React?");
    expect(r.value).toBe(String(gustavoProfile.skills.React));
  });

  it("localização fora do Brasil responde No na pergunta de morar no Brasil", () => {
    const p: CandidateProfile = { ...gustavoProfile, location: "Lisbon, Portugal" };
    const r = getSuggestedAnswer("Do you currently live in Brazil?", p);
    expect(r.value).toBe("No");
  });
});
