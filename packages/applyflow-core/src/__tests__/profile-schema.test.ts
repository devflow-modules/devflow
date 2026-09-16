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
    expect(p.skills.Python).toBeUndefined();
    expect(APPLYFLOW_SKILL_KEYS.filter((k) => k in p.skills)).toEqual(["React", "Nextjs"]);
    expect(p.answerBank).toEqual({
      professionalSummary: "",
      tellUsAboutYourself: "",
      whyGoodFit: "",
      availability: "",
      hardestChallenge: "",
      productCase: "",
      frontendCase: "",
      backendCase: "",
      automationCase: "",
      leadershipCase: "",
    });
    expect(p.facts).toEqual({});
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
    expect(p.answerBank.hardestChallenge).toBe("");
    expect(p.facts).toEqual({});
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

  it("não preenche factos a partir de skills (unknown permanece unknown)", () => {
    const p = validateCandidateProfile({
      name: "Dev Test",
      location: "Remote",
      englishLevel: "Fluent",
      comfortableInEnglish: true,
      roles: ["Engineer"],
      skills: { react: 7, python: 4 },
      salary: {
        cltPleno: "R$ 1",
        cltSenior: "R$ 2",
        pjSenior: "R$ 3",
        usdMonthly: "USD 1",
        usdHourly: "USD 1",
      },
    });
    expect(p.skills.React).toBe(7);
    expect(p.facts.reactYears).toBeUndefined();
    expect(p.facts.pythonYears).toBeUndefined();
    expect(p.facts.totalYearsExperience).toBeUndefined();
  });

  it("aceita CandidateFacts parciais sem inventar omissões", () => {
    const p = validateCandidateProfile({
      name: "Dev Test",
      location: "Remote",
      englishLevel: "Fluent",
      comfortableInEnglish: true,
      roles: ["Engineer"],
      skills: { react: 2 },
      salary: {
        cltPleno: "R$ 1",
        cltSenior: "R$ 2",
        pjSenior: "R$ 3",
        usdMonthly: "USD 1",
        usdHourly: "USD 1",
      },
      facts: { reactYears: 8, githubUrl: "https://github.com/example" },
    });
    expect(p.facts.reactYears).toBe(8);
    expect(p.facts.githubUrl).toBe("https://github.com/example");
    expect(p.facts.nodeYears).toBeUndefined();
    expect(p.facts.linkedinUrl).toBeUndefined();
  });

  it("perfis antigos sem facts continuam válidos", () => {
    const p = validateCandidateProfile({
      name: "Legado",
      location: "Brazil",
      englishLevel: "Advanced",
      comfortableInEnglish: true,
      roles: ["Engineer"],
      skills: { React: 5 },
      salary: {
        cltPleno: "a",
        cltSenior: "b",
        pjSenior: "c",
        usdMonthly: "d",
        usdHourly: "e",
      },
    });
    expect(p.name).toBe("Legado");
    expect(p.facts).toEqual({});
    expect(p.answerBank.productCase).toBe("");
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
      facts: { ...gustavoProfile.facts, reactYears: undefined },
      answerBank: { ...gustavoProfile.answerBank },
    };
    const r = getSuggestedAnswer("How many years of experience do you have with React?", custom);
    expect(r.value).toBe("7");
  });

  it("sem perfil explícito não usa dados de referência", () => {
    const r = getSuggestedAnswer("How many years of experience do you have with React?");
    expect(r.value).toBe("");
    expect(r.source).toBe("unknown");
  });

  it("localização fora do Brasil responde No na pergunta de morar no Brasil", () => {
    const p: CandidateProfile = {
      ...gustavoProfile,
      location: "Lisbon, Portugal",
      facts: { ...gustavoProfile.facts, location: undefined },
    };
    const r = getSuggestedAnswer("Do you currently live in Brazil?", p);
    expect(r.value).toBe("No");
  });
});

describe("perfil mínimo e informação desconhecida", () => {
  it("aceita perfil sem salário, inglês ou anos", () => {
    const p = validateCandidateProfile({
      name: "Ana Costa",
      roles: ["Product Engineer"],
      skills: { React: null },
    });
    expect(p.name).toBe("Ana Costa");
    expect(p.location).toBeUndefined();
    expect(p.englishLevel).toBeUndefined();
    expect(p.comfortableInEnglish).toBeUndefined();
    expect(p.skills.React).toBeNull();
    expect(p.skills.Python).toBeUndefined();
    expect(p.salary).toEqual({});
  });

  it("distingue unknown, zero e resposta negativa", () => {
    const p = validateCandidateProfile({
      name: "Ana Costa",
      roles: ["Engineer"],
      englishLevel: "Intermediate",
      comfortableInEnglish: false,
      skills: { React: 0, TypeScript: null },
      salary: { cltSenior: "" },
    });
    expect(p.comfortableInEnglish).toBe(false);
    expect(p.skills.React).toBe(0);
    expect(p.skills.TypeScript).toBeNull();
    expect(p.skills.Python).toBeUndefined();
    expect(p.salary.cltSenior).toBeUndefined();
  });

  it("JSON antigo com salário e skills zero-filled continua válido", () => {
    const p = validateCandidateProfile({
      name: "Legado",
      location: "Brazil",
      englishLevel: "Advanced",
      comfortableInEnglish: true,
      roles: ["Engineer"],
      skills: { React: 5, Elixir: 0 },
      salary: {
        cltPleno: "a",
        cltSenior: "b",
        pjSenior: "c",
        usdMonthly: "d",
        usdHourly: "e",
      },
    });
    expect(p.skills.React).toBe(5);
    expect(p.skills.Elixir).toBe(0);
    expect(p.salary.cltSenior).toBe("b");
    expect(p.englishLevel).toBe("Advanced");
  });
});

describe("getSuggestedAnswer com campos ausentes", () => {
  const sparse = validateCandidateProfile({
    name: "Ana Costa",
    roles: ["Product Engineer"],
    skills: { React: null },
  });

  it("não inventa anos, inglês nem salário", () => {
    expect(getSuggestedAnswer("How many years of experience do you have with Python?", sparse)).toMatchObject({
      value: "",
      source: "unknown",
    });
    expect(getSuggestedAnswer("Are you comfortable working in English?", sparse)).toMatchObject({
      value: "",
      source: "unknown",
    });
    expect(getSuggestedAnswer("What is your salary expectation in USD?", sparse)).toMatchObject({
      value: "",
      confidence: "low",
    });
  });

  it("zero explícito continua zero", () => {
    const p = validateCandidateProfile({
      name: "Ana Costa",
      roles: ["Engineer"],
      skills: { Elixir: 0 },
    });
    const r = getSuggestedAnswer("How many years of experience do you have with Elixir?", p);
    expect(r.value).toBe("0");
    expect(r.source).not.toBe("unknown");
  });

  it("conforto false continua No", () => {
    const p = validateCandidateProfile({
      name: "Ana Costa",
      roles: ["Engineer"],
      comfortableInEnglish: false,
    });
    expect(getSuggestedAnswer("Are you comfortable working in English?", p).value).toBe("No");
  });
});
