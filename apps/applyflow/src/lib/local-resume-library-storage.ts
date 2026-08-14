import { ensureResumeLibrary, gustavoProfile, type ResumeLibrary } from "@devflow/applyflow-core";

export const APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY = "APPLYFLOW_RESUME_LIBRARY_V1" as const;

export function loadResumeLibrary(): ResumeLibrary {
  const fallback = () =>
    ensureResumeLibrary({ stored: null, fallbackProfile: gustavoProfile, now: new Date() }).library;

  if (typeof window === "undefined") return fallback();
  try {
    const raw = window.localStorage.getItem(APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY);
    if (!raw) {
      const seeded = ensureResumeLibrary({ stored: null, fallbackProfile: gustavoProfile, now: new Date() });
      persistResumeLibrary(seeded.library);
      return seeded.library;
    }
    const data = JSON.parse(raw) as unknown;
    const ensured = ensureResumeLibrary({ stored: data, fallbackProfile: gustavoProfile, now: new Date() });
    if (ensured.recoveredFromCorrupt || ensured.migrated) {
      persistResumeLibrary(ensured.library);
    }
    return ensured.library;
  } catch {
    const seeded = ensureResumeLibrary({ stored: { broken: true }, fallbackProfile: gustavoProfile, now: new Date() });
    persistResumeLibrary(seeded.library);
    return seeded.library;
  }
}

export function persistResumeLibrary(library: ResumeLibrary): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY, JSON.stringify(library));
}

export function clearPersistedResumeLibrary(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY);
}
