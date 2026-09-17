import {
  buildCandidateEvidence,
  getDefaultResumeVariant,
  type CandidateProfile,
  type Evidence,
  type ResumeLibrary,
} from "@devflow/applyflow-core";

import { loadResumeLibrary } from "./local-resume-library-storage";

export type V2CandidateContext =
  | { ok: true; profile: CandidateProfile; library: ResumeLibrary; evidence: Evidence[] }
  | { ok: false };

/** Additional facts come from the stored profile only — never from a name or role coincidence. */
export function evidenceExtrasForCandidate(profile: CandidateProfile): Evidence[] {
  return profile.evidence ?? [];
}

export function resolveV2CandidateContext(): V2CandidateContext {
  const loaded = loadResumeLibrary();
  if (!loaded.library?.variants?.length) return { ok: false };
  try {
    const profile = getDefaultResumeVariant(loaded.library).profile;
    return {
      ok: true,
      profile,
      library: loaded.library,
      evidence: buildCandidateEvidence(profile, evidenceExtrasForCandidate(profile)),
    };
  } catch {
    return { ok: false };
  }
}
