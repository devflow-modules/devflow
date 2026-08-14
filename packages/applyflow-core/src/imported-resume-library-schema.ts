import { parseResumeLibrary } from "./resume-library-schema.js";
import { looksLikeCandidateProfile } from "./resume-library-schema.js";
import { RESUME_LIBRARY_IMPORT_KIND, RESUME_LIBRARY_SCHEMA_VERSION, type ResumeLibrary } from "./resume-library-types.js";
import { validateCandidateProfile, type CandidateProfile } from "./profile-schema.js";

export type ParsedResumeLibraryImport =
  | { ok: true; kind: "resume-library"; library: ResumeLibrary }
  | { ok: true; kind: "resume-profile"; profile: CandidateProfile }
  | { ok: false; error: string };

export function serializeResumeLibraryImport(library: ResumeLibrary): unknown {
  return {
    version: RESUME_LIBRARY_SCHEMA_VERSION,
    kind: RESUME_LIBRARY_IMPORT_KIND,
    defaultVariantId: library.defaultVariantId,
    variants: library.variants,
  };
}

export function parseResumeLibraryImport(raw: unknown): ParsedResumeLibraryImport {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Import de currículos inválido." };
  }

  const data = raw as { kind?: unknown };
  if (data.kind === RESUME_LIBRARY_IMPORT_KIND) {
    const parsed = parseResumeLibrary(raw);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    return { ok: true, kind: "resume-library", library: parsed.library };
  }

  if (looksLikeCandidateProfile(raw)) {
    return { ok: true, kind: "resume-profile", profile: validateCandidateProfile(raw) };
  }

  return { ok: false, error: "Não é um currículo nem uma biblioteca de currículos." };
}
