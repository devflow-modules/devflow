import { beforeEach, describe, expect, it } from "vitest";

import { gustavoProfile, validateCandidateProfile } from "@devflow/applyflow-core";

import {
  blankUnsavedCandidateProfile,
  getStoredCandidateProfile,
  invalidateStoredProfileCache,
  resetCandidateProfile,
  saveCandidateProfile,
} from "./profile-storage.js";
import { STORAGE_PROFILE_KEY } from "./storage-types.js";
import { chromeStorageBag } from "../test/chrome-storage-mock.js";

describe("profile-storage", () => {
  beforeEach(() => {
    invalidateStoredProfileCache();
  });

  it("sem perfil salvo retorna null — não usa dados de referência", async () => {
    expect(chromeStorageBag.size).toBe(0);
    const p = await getStoredCandidateProfile();
    expect(p).toBeNull();
    expect(await getStoredCandidateProfile()).toBeNull();
  });

  it("perfil customizado válido guardado é retornado", async () => {
    const custom = validateCandidateProfile({ ...gustavoProfile, name: "Nome de teste" });
    await saveCandidateProfile(custom);
    invalidateStoredProfileCache();
    const p = await getStoredCandidateProfile();
    expect(p?.name).toBe("Nome de teste");
  });

  it("valor em storage não validável não cai no perfil de referência", async () => {
    chromeStorageBag.set(STORAGE_PROFILE_KEY, { invalid: true } as unknown);
    invalidateStoredProfileCache();
    const p = await getStoredCandidateProfile();
    expect(p).toBeNull();
  });

  it("resetCandidateProfile limpa o storage e as leituras seguintes ficam vazias", async () => {
    const custom = validateCandidateProfile({ ...gustavoProfile, name: "Antes reset" });
    await saveCandidateProfile(custom);
    expect(await getStoredCandidateProfile()).toMatchObject({ name: "Antes reset" });

    invalidateStoredProfileCache();
    await resetCandidateProfile();
    invalidateStoredProfileCache();

    expect(chromeStorageBag.has(STORAGE_PROFILE_KEY)).toBe(false);
    expect(await getStoredCandidateProfile()).toBeNull();
  });

  it("perfil em storage sem answerBank (legado) normaliza ao ler", async () => {
    const legacy = {
      name: "Legado",
      location: "Brazil",
      englishLevel: "Advanced",
      comfortableInEnglish: true,
      roles: ["Engineer"],
      skills: { React: 5 },
      salary: {
        cltPleno: "R$ 1",
        cltSenior: "R$ 2",
        pjSenior: "R$ 3",
        usdMonthly: "USD 1",
        usdHourly: "USD 1",
      },
    };
    chromeStorageBag.set(STORAGE_PROFILE_KEY, legacy as unknown);
    invalidateStoredProfileCache();
    const p = await getStoredCandidateProfile();
    expect(p?.name).toBe("Legado");
    expect(p?.answerBank).toEqual({
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
    expect(p?.facts).toEqual({});
  });

  it("saveCandidateProfile lança se o perfil for inválido", async () => {
    await expect(
      saveCandidateProfile({} as import("@devflow/applyflow-core").CandidateProfile),
    ).rejects.toThrow();
  });

  it("rascunho vazio não contém dados pessoais de referência", () => {
    const blank = blankUnsavedCandidateProfile();
    expect(blank.name).toBe("");
    expect(blank.roles).toEqual([]);
    expect(blank.skills).toEqual({});
    expect(JSON.stringify(blank).toLowerCase()).not.toContain("gustavo");
  });

  it("preserva fatos adicionais gravados no perfil", async () => {
    const { buildRecordedFact } = await import("@devflow/applyflow-core");
    const fact = buildRecordedFact({
      id: "fact_ext",
      kind: "skill_component",
      topic: "supabase.database",
      label: "Supabase Database",
      origin: "candidate_declaration",
    });
    const custom = validateCandidateProfile({
      name: "Ana Lima",
      roles: ["Engineer"],
      skills: { React: null },
      evidence: [fact],
    });
    await saveCandidateProfile(custom);
    invalidateStoredProfileCache();
    const loaded = await getStoredCandidateProfile();
    expect(loaded?.evidence?.map((item) => item.id)).toEqual(["fact_ext"]);
  });
});
