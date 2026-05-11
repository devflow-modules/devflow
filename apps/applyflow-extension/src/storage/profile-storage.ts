import type { CandidateProfile } from "@devflow/applyflow-core";
import { gustavoProfile, validateCandidateProfile } from "@devflow/applyflow-core";

import { STORAGE_PROFILE_KEY } from "./storage-types.js";

let cached: CandidateProfile | undefined;

/** Invalida cache (ex.: após alteração externa ao storage). */
export function invalidateStoredProfileCache(): void {
  cached = undefined;
}

/** Lê perfil validado ou `gustavoProfile`; tolera falhas de IO/validação. */
export async function getStoredCandidateProfile(): Promise<CandidateProfile> {
  try {
    if (cached !== undefined) return cached;
    const bag = await chrome.storage.local.get(STORAGE_PROFILE_KEY);
    const raw = bag[STORAGE_PROFILE_KEY as keyof typeof bag];
    if (raw == null) {
      cached = gustavoProfile;
      return gustavoProfile;
    }
    const validated = validateCandidateProfile(raw as unknown);
    cached = validated;
    return validated;
  } catch {
    cached = gustavoProfile;
    return gustavoProfile;
  }
}

export async function saveCandidateProfile(profile: CandidateProfile): Promise<void> {
  const v = validateCandidateProfile(profile);
  await chrome.storage.local.set({ [STORAGE_PROFILE_KEY]: v });
  cached = v;
}

export async function resetCandidateProfile(): Promise<CandidateProfile> {
  await chrome.storage.local.remove(STORAGE_PROFILE_KEY);
  cached = gustavoProfile;
  return gustavoProfile;
}
