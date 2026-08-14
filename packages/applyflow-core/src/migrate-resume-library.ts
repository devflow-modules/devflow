import type { CandidateProfile } from "./profile-schema.js";
import { looksLikeCandidateProfile, parseResumeLibrary } from "./resume-library-schema.js";
import { createResumeLibraryFromProfile } from "./resume-library.js";
import type { ResumeLibrary } from "./resume-library-types.js";
import { validateCandidateProfile } from "./profile-schema.js";

export type EnsureResumeLibraryResult = {
  library: ResumeLibrary;
  migrated: boolean;
  recoveredFromCorrupt: boolean;
};

/**
 * Builds a ResumeLibrary from stored JSON or a legacy CandidateProfile.
 * Idempotent: a valid library is returned unchanged. Corrupt payloads fall back
 * to `fallbackProfile` without throwing.
 */
export function ensureResumeLibrary(input: {
  stored: unknown;
  fallbackProfile: CandidateProfile;
  now?: Date;
}): EnsureResumeLibraryResult {
  if (input.stored == null) {
    return {
      library: createResumeLibraryFromProfile(input.fallbackProfile, { now: input.now, source: "manual" }),
      migrated: true,
      recoveredFromCorrupt: false,
    };
  }

  const parsedLibrary = parseResumeLibrary(input.stored);
  if (parsedLibrary.ok) {
    return { library: parsedLibrary.library, migrated: false, recoveredFromCorrupt: false };
  }

  if (looksLikeCandidateProfile(input.stored)) {
    return {
      library: createResumeLibraryFromProfile(validateCandidateProfile(input.stored), {
        now: input.now,
        source: "import",
      }),
      migrated: true,
      recoveredFromCorrupt: false,
    };
  }

  return {
    library: createResumeLibraryFromProfile(input.fallbackProfile, { now: input.now, source: "manual" }),
    migrated: true,
    recoveredFromCorrupt: true,
  };
}
