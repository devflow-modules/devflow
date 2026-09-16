import type { CandidateProfile } from "@devflow/applyflow-core";
import { EMPTY_ANSWER_BANK, validateCandidateProfile } from "@devflow/applyflow-core";

import { STORAGE_PROFILE_KEY } from "./storage-types.js";

let cached: CandidateProfile | null | undefined;

/** Perfil editável sem dados de referência — inválido até o utilizador preencher e guardar. */
export function blankUnsavedCandidateProfile(): CandidateProfile {
  return {
    name: "",
    roles: [],
    skills: {},
    salary: {},
    answerBank: { ...EMPTY_ANSWER_BANK },
    facts: {},
  };
}

/** Invalida cache (ex.: após alteração externa ao storage). */
export function invalidateStoredProfileCache(): void {
  cached = undefined;
}

/** Lê perfil validado ou `null` quando não há storage / IO falha / JSON inválido. */
export async function getStoredCandidateProfile(): Promise<CandidateProfile | null> {
  try {
    if (cached !== undefined) return cached;
    const bag = await chrome.storage.local.get(STORAGE_PROFILE_KEY);
    const raw = bag[STORAGE_PROFILE_KEY as keyof typeof bag];
    if (raw == null) {
      cached = null;
      return null;
    }
    const validated = validateCandidateProfile(raw as unknown);
    cached = validated;
    return validated;
  } catch {
    cached = null;
    return null;
  }
}

export async function saveCandidateProfile(profile: CandidateProfile): Promise<void> {
  const v = validateCandidateProfile(profile);
  await chrome.storage.local.set({ [STORAGE_PROFILE_KEY]: v });
  cached = v;
}

export async function resetCandidateProfile(): Promise<null> {
  await chrome.storage.local.remove(STORAGE_PROFILE_KEY);
  cached = null;
  return null;
}
