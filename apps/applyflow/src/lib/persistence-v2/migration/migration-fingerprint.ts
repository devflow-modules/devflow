/**
 * Deterministic fingerprint helpers for V1→V2 migration.
 *
 * Bundle fingerprints identify the logical Jobs/Applications dataset by
 * preserved client IDs and material fields. Volatile envelope timestamps
 * (`savedAt`, `importedAt`) and server `version`/timestamps are excluded.
 *
 * Ordering: Jobs and Applications are sorted by preserved `id` (set-like).
 * Record identity remains the client ID — never canonicalUrl/descriptionHash.
 */

export type MigrationJobFingerprintInput = {
  id: string;
  title: string;
  company?: string | null;
  location?: string | null;
  url?: string | null;
  source: string;
  status: string;
  jobContext: unknown;
  descriptionSnapshot?: string | null;
  jobMatch: unknown;
  evaluatedWith?: unknown;
  curriculumRecommendation?: unknown;
  applicationPack?: unknown;
};

export type MigrationApplicationFingerprintInput = {
  id: string;
  source: string;
  status: string;
  sourceJobId?: string | null;
  jobTitle?: string | null;
  companyName?: string | null;
  jobUrl?: string | null;
  fitScore?: number | null;
  notes?: string | null;
  jobMeta?: unknown;
  v2Meta?: unknown;
  extras?: unknown;
};

export type MigrationBundleFingerprintInput = {
  jobs: readonly MigrationJobFingerprintInput[];
  applications: readonly MigrationApplicationFingerprintInput[];
};

const ACCOUNT_FINGERPRINT_PREFIX = "applyflow-v1-to-v2-account-v1:";
const BUNDLE_FINGERPRINT_PREFIX = "applyflow-v1-to-v2-bundle-v1:";

/** FNV-1a 32-bit hex — non-cryptographic, stable across reloads. */
export function hashStableUtf8(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Non-reversible local fingerprint of the ApplyFlow account id from GET /me.
 * Prevents marker reuse across accounts in the same browser. Not auth.
 */
export function fingerprintApplyFlowAccountId(accountId: string): string {
  return hashStableUtf8(`${ACCOUNT_FINGERPRINT_PREFIX}${accountId.trim()}`);
}

function sortedKeys(value: Record<string, unknown>): string[] {
  return Object.keys(value).sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

/** Stable JSON for fingerprinting: sorted object keys, arrays keep order. */
export function canonicalizeForFingerprint(value: unknown): string {
  return JSON.stringify(canonicalizeValue(value));
}

function canonicalizeValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalizeValue);
  const record = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of sortedKeys(record)) {
    const entry = record[key];
    if (entry === undefined) continue;
    out[key] = canonicalizeValue(entry);
  }
  return out;
}

function compareById(left: { id: string }, right: { id: string }): number {
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

function normalizeJob(job: MigrationJobFingerprintInput): Record<string, unknown> {
  return {
    id: job.id,
    title: job.title,
    company: job.company ?? null,
    location: job.location ?? null,
    url: job.url ?? null,
    source: job.source,
    status: job.status,
    jobContext: job.jobContext,
    descriptionSnapshot: job.descriptionSnapshot ?? null,
    jobMatch: job.jobMatch,
    evaluatedWith: job.evaluatedWith ?? null,
    curriculumRecommendation: job.curriculumRecommendation ?? null,
    applicationPack: job.applicationPack ?? null,
  };
}

function normalizeApplication(application: MigrationApplicationFingerprintInput): Record<string, unknown> {
  return {
    id: application.id,
    source: application.source,
    status: application.status,
    sourceJobId: application.sourceJobId ?? null,
    jobTitle: application.jobTitle ?? null,
    companyName: application.companyName ?? null,
    jobUrl: application.jobUrl ?? null,
    fitScore: application.fitScore ?? null,
    notes: application.notes ?? null,
    jobMeta: application.jobMeta ?? null,
    v2Meta: application.v2Meta ?? null,
    extras: application.extras ?? null,
  };
}

/**
 * Deterministic fingerprint of the logical V1 migration dataset.
 * Jobs/Applications are ordered by preserved id before hashing.
 */
export function fingerprintMigrationBundle(bundle: MigrationBundleFingerprintInput): string {
  const payload = {
    jobs: [...bundle.jobs].sort(compareById).map(normalizeJob),
    applications: [...bundle.applications].sort(compareById).map(normalizeApplication),
  };
  return hashStableUtf8(`${BUNDLE_FINGERPRINT_PREFIX}${canonicalizeForFingerprint(payload)}`);
}
