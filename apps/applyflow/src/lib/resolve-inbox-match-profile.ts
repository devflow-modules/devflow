import { getDefaultResumeVariant, type CandidateProfile, type ResumeLibrary } from "@devflow/applyflow-core";

/** Job Match uses the default resume. Never invents a seed profile. */
export function resolveInboxMatchProfile(library: ResumeLibrary | null | undefined): CandidateProfile | null {
  if (!library) return null;
  try {
    return getDefaultResumeVariant(library).profile;
  } catch {
    return null;
  }
}
