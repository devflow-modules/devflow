import { beforeEach, describe, expect, it } from "vitest";

import { gustavoProfile, validateCandidateProfile } from "@devflow/applyflow-core";

import {
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

  it("sem perfil salvo retorna gustavoProfile", async () => {
    expect(chromeStorageBag.size).toBe(0);
    const p = await getStoredCandidateProfile();
    expect(p.name).toBe(gustavoProfile.name);
    expect(await getStoredCandidateProfile()).toEqual(p);
  });

  it("perfil customizado válido guardado é retornado", async () => {
    const custom = validateCandidateProfile({ ...gustavoProfile, name: "Nome de teste" });
    await saveCandidateProfile(custom);
    invalidateStoredProfileCache();
    const p = await getStoredCandidateProfile();
    expect(p.name).toBe("Nome de teste");
  });

  it("valor em storage não validável produz fallback seguro gustavoProfile", async () => {
    chromeStorageBag.set(STORAGE_PROFILE_KEY, { invalid: true } as unknown);
    invalidateStoredProfileCache();
    const p = await getStoredCandidateProfile();
    expect(p).toEqual(gustavoProfile);
  });

  it("resetCandidateProfile restaura uso de gustavoProfile nas leituras seguintes", async () => {
    const custom = validateCandidateProfile({ ...gustavoProfile, name: "Antes reset" });
    await saveCandidateProfile(custom);
    expect(await getStoredCandidateProfile()).toMatchObject({ name: "Antes reset" });

    invalidateStoredProfileCache();
    await resetCandidateProfile();
    invalidateStoredProfileCache();

    expect(chromeStorageBag.has(STORAGE_PROFILE_KEY)).toBe(false);
    const restored = await getStoredCandidateProfile();
    expect(restored.name).toBe(gustavoProfile.name);
  });

  it("saveCandidateProfile lança se o perfil for inválido", async () => {
    await expect(
      saveCandidateProfile({} as import("@devflow/applyflow-core").CandidateProfile),
    ).rejects.toThrow();
  });
});
