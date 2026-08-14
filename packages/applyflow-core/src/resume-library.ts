import type { CandidateProfile } from "./profile-schema.js";
import { validateCandidateProfile } from "./profile-schema.js";
import {
  LEGACY_RESUME_VARIANT_ID,
  LEGACY_RESUME_VARIANT_NAME,
  RESUME_LIBRARY_SCHEMA_VERSION,
  type ResumeLibrary,
  type ResumeVariant,
  type ResumeVariantSource,
} from "./resume-library-types.js";

export type ResumeLibraryOpResult =
  | { ok: true; library: ResumeLibrary }
  | { ok: false; error: string; library: ResumeLibrary };

function cloneProfile(profile: CandidateProfile): CandidateProfile {
  return validateCandidateProfile(JSON.parse(JSON.stringify(profile)) as unknown);
}

function iso(now: Date): string {
  return now.toISOString();
}

function normalizeName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (trimmed.length > 80) return null;
  return trimmed;
}

export function createResumeVariantId(now: Date = new Date(), entropy = Math.random().toString(36).slice(2, 10)): string {
  return `rv_${now.getTime().toString(36)}_${entropy}`;
}

export function getDefaultResumeVariant(library: ResumeLibrary): ResumeVariant {
  const found = library.variants.find((variant) => variant.id === library.defaultVariantId);
  if (!found) {
    throw new Error("Biblioteca de currículos sem variante padrão.");
  }
  return found;
}

export function createResumeLibraryFromProfile(
  profile: CandidateProfile,
  options?: { now?: Date; name?: string; id?: string; source?: ResumeVariantSource },
): ResumeLibrary {
  const now = options?.now ?? new Date();
  const stamp = iso(now);
  const name = normalizeName(options?.name ?? LEGACY_RESUME_VARIANT_NAME) ?? LEGACY_RESUME_VARIANT_NAME;
  const id = options?.id ?? LEGACY_RESUME_VARIANT_ID;
  const variant: ResumeVariant = {
    id,
    name,
    profile: cloneProfile(profile),
    isDefault: true,
    source: options?.source ?? "manual",
    createdAt: stamp,
    updatedAt: stamp,
  };
  return {
    version: RESUME_LIBRARY_SCHEMA_VERSION,
    variants: [variant],
    defaultVariantId: id,
  };
}

function withSyncedDefaults(library: ResumeLibrary): ResumeLibrary {
  return {
    ...library,
    version: RESUME_LIBRARY_SCHEMA_VERSION,
    variants: library.variants.map((variant) => ({
      ...variant,
      isDefault: variant.id === library.defaultVariantId,
    })),
  };
}

function fail(library: ResumeLibrary, error: string): ResumeLibraryOpResult {
  return { ok: false, error, library };
}

export function setDefaultResumeVariant(
  library: ResumeLibrary,
  variantId: string,
  now: Date = new Date(),
): ResumeLibraryOpResult {
  const target = library.variants.find((variant) => variant.id === variantId);
  if (!target) {
    return fail(library, "Currículo não encontrado.");
  }
  const stamp = iso(now);
  return {
    ok: true,
    library: withSyncedDefaults({
      ...library,
      defaultVariantId: variantId,
      variants: library.variants.map((variant) =>
        variant.id === variantId ? { ...variant, updatedAt: stamp } : variant,
      ),
    }),
  };
}

export function renameResumeVariant(
  library: ResumeLibrary,
  variantId: string,
  name: string,
  now: Date = new Date(),
): ResumeLibraryOpResult {
  const nextName = normalizeName(name);
  if (!nextName) {
    return fail(library, "O nome do currículo não pode ficar vazio.");
  }
  const target = library.variants.find((variant) => variant.id === variantId);
  if (!target) {
    return fail(library, "Currículo não encontrado.");
  }
  return {
    ok: true,
    library: withSyncedDefaults({
      ...library,
      variants: library.variants.map((variant) =>
        variant.id === variantId ? { ...variant, name: nextName, updatedAt: iso(now) } : variant,
      ),
    }),
  };
}

export function deleteResumeVariant(library: ResumeLibrary, variantId: string): ResumeLibraryOpResult {
  if (library.variants.length <= 1) {
    return fail(library, "Não podes excluir o único currículo da biblioteca.");
  }
  if (variantId === library.defaultVariantId) {
    return fail(library, "Define outro currículo como padrão antes de excluir este.");
  }
  const exists = library.variants.some((variant) => variant.id === variantId);
  if (!exists) {
    return fail(library, "Currículo não encontrado.");
  }
  return {
    ok: true,
    library: withSyncedDefaults({
      ...library,
      variants: library.variants.filter((variant) => variant.id !== variantId),
    }),
  };
}

export function addResumeVariant(
  library: ResumeLibrary,
  input: {
    profile: CandidateProfile;
    name: string;
    now?: Date;
    id?: string;
    source?: ResumeVariantSource;
    makeDefault?: boolean;
  },
): ResumeLibraryOpResult {
  const name = normalizeName(input.name);
  if (!name) {
    return fail(library, "O nome do currículo não pode ficar vazio.");
  }
  const now = input.now ?? new Date();
  const stamp = iso(now);
  const id = input.id ?? createResumeVariantId(now);
  if (library.variants.some((variant) => variant.id === id)) {
    return fail(library, "Já existe um currículo com este identificador.");
  }
  const variant: ResumeVariant = {
    id,
    name,
    profile: cloneProfile(input.profile),
    isDefault: false,
    source: input.source ?? "manual",
    createdAt: stamp,
    updatedAt: stamp,
  };
  const next: ResumeLibrary = {
    ...library,
    variants: [...library.variants, variant],
    defaultVariantId: input.makeDefault ? id : library.defaultVariantId,
  };
  return { ok: true, library: withSyncedDefaults(next) };
}

export function duplicateResumeVariant(
  library: ResumeLibrary,
  variantId: string,
  options?: { name?: string; now?: Date; id?: string },
): ResumeLibraryOpResult {
  const source = library.variants.find((variant) => variant.id === variantId);
  if (!source) {
    return fail(library, "Currículo não encontrado.");
  }
  const name = options?.name ?? `Cópia de ${source.name}`;
  return addResumeVariant(library, {
    profile: source.profile,
    name,
    now: options?.now,
    id: options?.id,
    source: "manual",
  });
}
