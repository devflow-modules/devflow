import type { CandidateProfile } from "./profile-schema.js";

export const RESUME_LIBRARY_SCHEMA_VERSION = 1 as const;
export const RESUME_LIBRARY_IMPORT_KIND = "resume-library" as const;

export const RESUME_VARIANT_SOURCES = ["manual", "import"] as const;
export type ResumeVariantSource = (typeof RESUME_VARIANT_SOURCES)[number];

/** Stable id for the first variant created from a legacy single CandidateProfile. */
export const LEGACY_RESUME_VARIANT_ID = "rv_principal" as const;
export const LEGACY_RESUME_VARIANT_NAME = "Perfil principal" as const;

export type ResumeVariant = {
  id: string;
  name: string;
  profile: CandidateProfile;
  isDefault: boolean;
  source?: ResumeVariantSource;
  createdAt: string;
  updatedAt: string;
};

export type ResumeLibrary = {
  version: typeof RESUME_LIBRARY_SCHEMA_VERSION;
  variants: ResumeVariant[];
  defaultVariantId: string;
};
