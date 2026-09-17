import {
  createResumeLibraryFromProfile,
  looksLikeCandidateProfile,
  parseResumeLibrary,
  validateCandidateProfile,
  type ResumeLibrary,
} from "@devflow/applyflow-core";

export const APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY = "APPLYFLOW_RESUME_LIBRARY_V1" as const;

export type ResumeLibraryLoadStatus = "empty" | "ok" | "unreadable";

export type ResumeLibraryLoadResult = {
  library: ResumeLibrary | null;
  status: ResumeLibraryLoadStatus;
  migrated?: boolean;
};

function emptyResult(): ResumeLibraryLoadResult {
  return { library: null, status: "empty" };
}

/** Use this for React state. Never assign the load envelope to a ResumeLibrary. */
export function hydrateResumeLibraryState(): {
  library: ResumeLibrary | null;
  status: ResumeLibraryLoadStatus;
} {
  const loaded = loadResumeLibrary();
  return { library: loaded.library, status: loaded.status };
}

export function loadResumeLibrary(): ResumeLibraryLoadResult {
  if (typeof window === "undefined") return emptyResult();

  const raw = window.localStorage.getItem(APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY);
  if (raw == null) return emptyResult();

  let data: unknown;
  try {
    data = JSON.parse(raw) as unknown;
  } catch {
    return { library: null, status: "unreadable" };
  }

  const parsed = parseResumeLibrary(data);
  if (parsed.ok) {
    return { library: parsed.library, status: "ok" };
  }

  if (looksLikeCandidateProfile(data)) {
    const library = createResumeLibraryFromProfile(validateCandidateProfile(data), {
      now: new Date(),
      source: "import",
    });
    persistResumeLibrary(library);
    return { library, status: "ok", migrated: true };
  }

  return { library: null, status: "unreadable" };
}

export function persistResumeLibrary(library: ResumeLibrary): { ok: true } | { ok: false; error: string } {
  if (typeof window === "undefined") {
    return { ok: false, error: "Armazenamento local indisponível." };
  }
  const parsed = parseResumeLibrary(library);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }
  try {
    window.localStorage.setItem(APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY, JSON.stringify(parsed.library));
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível gravar a biblioteca de currículos. O perfil em memória não foi substituído." };
  }
}

export function clearPersistedResumeLibrary(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY);
}
