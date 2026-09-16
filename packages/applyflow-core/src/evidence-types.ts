export const EVIDENCE_SUBJECTS = [
  "skill",
  "experience",
  "project",
  "metric",
  "education",
  "language",
  "achievement",
] as const;

export type EvidenceSubject = (typeof EVIDENCE_SUBJECTS)[number];

export const EVIDENCE_SOURCES = ["resume", "candidate_input", "project", "verified_profile"] as const;

export type EvidenceSource = (typeof EVIDENCE_SOURCES)[number];

export const EVIDENCE_CONFIDENCE = ["verified", "strong", "partial"] as const;

export type EvidenceConfidence = (typeof EVIDENCE_CONFIDENCE)[number];

export const EVIDENCE_ORIGINS = ["candidate_declaration", "document"] as const;
export type EvidenceOrigin = (typeof EVIDENCE_ORIGINS)[number];

export const EVIDENCE_STANCES = ["known", "absent", "unknown"] as const;
export type EvidenceStance = (typeof EVIDENCE_STANCES)[number];

export const EVIDENCE_KINDS = [
  "skill_component",
  "joint_skill",
  "experience_period",
  "availability",
  "other",
] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export const EVIDENCE_DST_POLICIES = ["ambiguous", "standard", "observes_dst"] as const;
export type EvidenceDstPolicy = (typeof EVIDENCE_DST_POLICIES)[number];

export type EvidenceScheduleWindow = {
  label: string;
  timezoneLabel?: string;
  dstPolicy?: EvidenceDstPolicy;
};

/**
 * Provable fact about a candidate. Domain rules must not assume a named person.
 * Person-specific seeds live in `evidence-seed.ts`, same split as `candidate-profile`.
 * Optional structured fields keep origin, period and job scope without inventing claims.
 */
export type Evidence = {
  id: string;
  subject: EvidenceSubject;
  label: string;
  description: string;
  source: EvidenceSource;
  sourceRef?: string;
  company?: string;
  project?: string;
  technologies?: string[];
  confidence: EvidenceConfidence;
  usableForClaims: boolean;
  createdAt: string;
  updatedAt: string;
  kind?: EvidenceKind;
  topic?: string;
  stance?: EvidenceStance;
  origin?: EvidenceOrigin;
  confirmedAt?: string;
  declaredValue?: string;
  periodStart?: string;
  periodEnd?: string;
  scheduleWindow?: EvidenceScheduleWindow;
  relatedJobId?: string;
};

export type EvidenceLibrary = {
  version: 1;
  evidence: Evidence[];
};
