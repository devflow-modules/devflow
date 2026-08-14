import { z } from "zod";

import { candidateProfileSchema, validateCandidateProfile } from "./profile-schema.js";
import {
  RESUME_LIBRARY_SCHEMA_VERSION,
  RESUME_VARIANT_SOURCES,
  type ResumeLibrary,
  type ResumeVariant,
} from "./resume-library-types.js";

const variantRecordSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(80),
  profile: z.unknown(),
  isDefault: z.boolean().optional(),
  source: z.enum(RESUME_VARIANT_SOURCES).optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

const libraryRecordSchema = z.object({
  version: z.literal(RESUME_LIBRARY_SCHEMA_VERSION),
  kind: z.literal("resume-library").optional(),
  defaultVariantId: z.string().trim().min(1).max(80),
  variants: z.array(z.unknown()).min(1),
});

export type ParseResumeLibraryResult =
  | { ok: true; library: ResumeLibrary }
  | { ok: false; error: string };

function normalizeVariant(raw: unknown): ResumeVariant | null {
  const parsed = variantRecordSchema.safeParse(raw);
  if (!parsed.success) return null;
  try {
    const profile = validateCandidateProfile(parsed.data.profile);
    return {
      id: parsed.data.id,
      name: parsed.data.name,
      profile,
      isDefault: parsed.data.isDefault === true,
      source: parsed.data.source,
      createdAt: parsed.data.createdAt,
      updatedAt: parsed.data.updatedAt,
    };
  } catch {
    return null;
  }
}

export function parseResumeLibrary(raw: unknown): ParseResumeLibraryResult {
  const envelope = libraryRecordSchema.safeParse(raw);
  if (!envelope.success) {
    return { ok: false, error: "Biblioteca de currículos inválida." };
  }

  const variants: ResumeVariant[] = [];
  for (const item of envelope.data.variants) {
    const variant = normalizeVariant(item);
    if (variant) variants.push(variant);
  }

  if (variants.length === 0) {
    return { ok: false, error: "Nenhum currículo válido na biblioteca." };
  }

  const defaultExists = variants.some((variant) => variant.id === envelope.data.defaultVariantId);
  const defaultVariantId = defaultExists ? envelope.data.defaultVariantId : variants[0]!.id;

  const library: ResumeLibrary = {
    version: RESUME_LIBRARY_SCHEMA_VERSION,
    defaultVariantId,
    variants: variants.map((variant) => ({
      ...variant,
      isDefault: variant.id === defaultVariantId,
    })),
  };

  const defaultCount = library.variants.filter((variant) => variant.isDefault).length;
  if (defaultCount !== 1) {
    return { ok: false, error: "A biblioteca precisa de exactamente um currículo padrão." };
  }

  return { ok: true, library };
}

/** True when the payload is explicitly a versioned resume library, not jobs/applications. */
export function isResumeLibraryImportV1(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const data = raw as { version?: unknown; kind?: unknown };
  return data.version === RESUME_LIBRARY_SCHEMA_VERSION && data.kind === "resume-library";
}

export function looksLikeCandidateProfile(raw: unknown): boolean {
  return candidateProfileSchema.safeParse(raw).success;
}
