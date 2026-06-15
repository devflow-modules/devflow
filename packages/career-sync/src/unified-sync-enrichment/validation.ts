import type { CareerSyncSignal, ProcessStage, SyncConfidence, SyncSource } from "../shared/types.js";
import type { ProviderDerivedSignalSummary } from "../provider-derived-signals/types.js";
import type { CareerBundleUnifiedSyncEnrichment } from "./types.js";

const SYNC_SOURCES = new Set<SyncSource>(["gmail", "calendar"]);
const SYNC_CONFIDENCE = new Set<SyncConfidence>(["low", "medium", "high"]);
const PROCESS_STAGES = new Set<ProcessStage>([
  "sourced",
  "applied",
  "screening",
  "interview",
  "technical",
  "offer",
  "rejected",
  "unknown",
]);

const FORBIDDEN_ROOT_KEYS = new Set([
  "access_token",
  "refresh_token",
  "client_secret",
  "authorization_code",
  "connectionId",
  "end_user_id",
  "providerPayload",
  "rawPayload",
]);

export type CareerBundleUnifiedSyncEnrichmentValidationResult =
  | {
      valid: true;
      value: CareerBundleUnifiedSyncEnrichment;
      warnings: string[];
      errors: [];
    }
  | {
      valid: false;
      warnings: string[];
      errors: string[];
    };

export type ValidateCareerBundleUnifiedSyncEnrichmentOptions = {
  expectedSummary?: ProviderDerivedSignalSummary;
  /** When true, combinedSignals must not include provider identifiers. Default false for legacy demo enrichments. */
  rejectProviderIdentifiers?: boolean;
};

function invalidResult(
  errors: string[],
  warnings: string[] = [],
): CareerBundleUnifiedSyncEnrichmentValidationResult {
  return {
    valid: false,
    warnings,
    errors,
  };
}

function isValidIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && Number.isFinite(Date.parse(value));
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function hasForbiddenRootKey(value: Record<string, unknown>): string | undefined {
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_ROOT_KEYS.has(key)) {
      return key;
    }
  }

  return undefined;
}

function validateCareerSyncSignal(
  signal: unknown,
  index: number,
  options: ValidateCareerBundleUnifiedSyncEnrichmentOptions,
): string[] {
  const errors: string[] = [];

  if (signal == null || typeof signal !== "object" || Array.isArray(signal)) {
    return [`combinedSignals[${index}] must be an object.`];
  }

  const candidate = signal as Record<string, unknown>;

  if (typeof candidate.id !== "string" || candidate.id.length === 0) {
    errors.push(`combinedSignals[${index}].id must be a non-empty string.`);
  }

  if (!SYNC_SOURCES.has(candidate.source as SyncSource)) {
    errors.push(`combinedSignals[${index}].source must be gmail or calendar.`);
  }

  if (!SYNC_CONFIDENCE.has(candidate.confidence as SyncConfidence)) {
    errors.push(`combinedSignals[${index}].confidence must be low, medium, or high.`);
  }

  if (typeof candidate.safeSummary !== "string") {
    errors.push(`combinedSignals[${index}].safeSummary must be a string.`);
  }

  if (candidate.rawRetained !== false) {
    errors.push(`combinedSignals[${index}].rawRetained must be false.`);
  }

  if (options.rejectProviderIdentifiers === true && candidate.providerId != null) {
    errors.push(`combinedSignals[${index}] must not include provider identifiers.`);
  }

  if (
    candidate.companyHint != null &&
    (typeof candidate.companyHint !== "string" || candidate.companyHint.length === 0)
  ) {
    errors.push(`combinedSignals[${index}].companyHint must be a non-empty string when provided.`);
  }

  if (
    candidate.roleHint != null &&
    (typeof candidate.roleHint !== "string" || candidate.roleHint.length === 0)
  ) {
    errors.push(`combinedSignals[${index}].roleHint must be a non-empty string when provided.`);
  }

  if (
    candidate.processStage != null &&
    !PROCESS_STAGES.has(candidate.processStage as ProcessStage)
  ) {
    errors.push(`combinedSignals[${index}].processStage is invalid.`);
  }

  if (candidate.actionRequired != null && typeof candidate.actionRequired !== "boolean") {
    errors.push(`combinedSignals[${index}].actionRequired must be a boolean when provided.`);
  }

  if (candidate.receivedAt != null && !isValidIsoTimestamp(candidate.receivedAt)) {
    errors.push(`combinedSignals[${index}].receivedAt must be a valid ISO timestamp when provided.`);
  }

  if (candidate.eventAt != null && !isValidIsoTimestamp(candidate.eventAt)) {
    errors.push(`combinedSignals[${index}].eventAt must be a valid ISO timestamp when provided.`);
  }

  return errors;
}

function validatePrivacy(
  privacy: unknown,
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (privacy == null || typeof privacy !== "object" || Array.isArray(privacy)) {
    return {
      errors: ["privacy must be an object."],
      warnings,
    };
  }

  const candidate = privacy as Record<string, unknown>;

  if (candidate.rawRetained !== false) {
    errors.push("privacy.rawRetained must be false.");
  }

  if (candidate.redacted !== true) {
    warnings.push("privacy.redacted must be true.");
  }

  if (candidate.meetingLinksRemoved !== true) {
    errors.push("privacy.meetingLinksRemoved must be true.");
  }

  if (candidate.providerPayloadRetained !== false) {
    errors.push("privacy.providerPayloadRetained must be false.");
  }

  if (candidate.userReviewRequired !== true) {
    warnings.push("privacy.userReviewRequired must be true.");
  }

  return { errors, warnings };
}

function validateStats(stats: unknown): string[] {
  const errors: string[] = [];

  if (stats == null || typeof stats !== "object" || Array.isArray(stats)) {
    return ["stats must be an object."];
  }

  const candidate = stats as Record<string, unknown>;

  for (const field of ["totalSignals", "actionRequiredCount", "upcomingCount"] as const) {
    if (!isNonNegativeInteger(candidate[field])) {
      errors.push(`stats.${field} must be a non-negative integer.`);
    }
  }

  if (
    candidate.stageCounts == null ||
    typeof candidate.stageCounts !== "object" ||
    Array.isArray(candidate.stageCounts)
  ) {
    errors.push("stats.stageCounts must be an object.");
  } else {
    for (const [key, value] of Object.entries(candidate.stageCounts as Record<string, unknown>)) {
      if (!isNonNegativeInteger(value)) {
        errors.push(`stats.stageCounts.${key} must be a non-negative integer.`);
      }
    }
  }

  if (
    candidate.sourceCounts == null ||
    typeof candidate.sourceCounts !== "object" ||
    Array.isArray(candidate.sourceCounts)
  ) {
    errors.push("stats.sourceCounts must be an object.");
  } else {
    const sourceCounts = candidate.sourceCounts as Record<string, unknown>;
    for (const source of ["gmail", "calendar"] as const) {
      if (!isNonNegativeInteger(sourceCounts[source])) {
        errors.push(`stats.sourceCounts.${source} must be a non-negative integer.`);
      }
    }
  }

  if (!Array.isArray(candidate.companyHints)) {
    errors.push("stats.companyHints must be an array.");
  } else if (!candidate.companyHints.every((hint) => typeof hint === "string")) {
    errors.push("stats.companyHints must contain strings.");
  }

  return errors;
}

function validateSourceBlock(
  block: unknown,
  field: "gmail" | "calendar",
): string[] {
  if (block == null) {
    return [];
  }

  if (typeof block !== "object" || Array.isArray(block)) {
    return [`${field} must be an object when provided.`];
  }

  const candidate = block as Record<string, unknown>;
  const errors: string[] = [];

  if (candidate.source !== field) {
    errors.push(`${field}.source must be "${field}".`);
  }

  if (!Array.isArray(candidate.signals)) {
    errors.push(`${field}.signals must be an array when provided.`);
  }

  if (typeof candidate.summary !== "string") {
    errors.push(`${field}.summary must be a string when provided.`);
  }

  if (!isValidIsoTimestamp(candidate.generatedAt)) {
    errors.push(`${field}.generatedAt must be a valid ISO timestamp when provided.`);
  }

  if (candidate.rawRetained !== false) {
    errors.push(`${field}.rawRetained must be false when provided.`);
  }

  return errors;
}

function validateExpectedSummary(
  enrichment: CareerBundleUnifiedSyncEnrichment,
  expectedSummary: ProviderDerivedSignalSummary,
): string[] {
  const errors: string[] = [];

  if (enrichment.stats.totalSignals !== expectedSummary.totalSignals) {
    errors.push("stats.totalSignals does not match composition summary.");
  }

  if (enrichment.stats.sourceCounts.gmail !== expectedSummary.gmailSignalCount) {
    errors.push("stats.sourceCounts.gmail does not match composition summary.");
  }

  if (enrichment.stats.sourceCounts.calendar !== expectedSummary.calendarSignalCount) {
    errors.push("stats.sourceCounts.calendar does not match composition summary.");
  }

  const companyHints = [...expectedSummary.companies].sort((left, right) => left.localeCompare(right));
  if (JSON.stringify(enrichment.stats.companyHints) !== JSON.stringify(companyHints)) {
    errors.push("stats.companyHints does not match composition summary.");
  }

  return errors;
}

export function validateCareerBundleUnifiedSyncEnrichment(
  value: unknown,
  options?: ValidateCareerBundleUnifiedSyncEnrichmentOptions,
): CareerBundleUnifiedSyncEnrichmentValidationResult {
  if (value == null) {
    return invalidResult(["CareerBundleUnifiedSyncEnrichment must be an object."]);
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    return invalidResult(["CareerBundleUnifiedSyncEnrichment must be an object."]);
  }

  const candidate = value as Record<string, unknown>;
  const errors: string[] = [];
  const warnings: string[] = [];

  const forbiddenKey = hasForbiddenRootKey(candidate);
  if (forbiddenKey) {
    errors.push(`Forbidden field "${forbiddenKey}" is not allowed.`);
  }

  if (candidate.source !== "sync") {
    errors.push('source must be "sync".');
  }

  if (!Array.isArray(candidate.combinedSignals)) {
    errors.push("combinedSignals must be an array.");
  } else {
    candidate.combinedSignals.forEach((signal, index) => {
      errors.push(...validateCareerSyncSignal(signal, index, options ?? {}));
    });
  }

  if (typeof candidate.summary !== "string") {
    errors.push("summary must be a string.");
  }

  errors.push(...validateStats(candidate.stats));

  if (!isValidIsoTimestamp(candidate.generatedAt)) {
    errors.push("generatedAt must be a valid ISO timestamp.");
  }

  const privacyValidation = validatePrivacy(candidate.privacy);
  errors.push(...privacyValidation.errors);
  warnings.push(...privacyValidation.warnings);

  errors.push(...validateSourceBlock(candidate.gmail, "gmail"));
  errors.push(...validateSourceBlock(candidate.calendar, "calendar"));

  if (errors.length > 0) {
    return invalidResult(errors, warnings);
  }

  const enrichment = value as CareerBundleUnifiedSyncEnrichment;

  if (options?.expectedSummary) {
    const summaryErrors = validateExpectedSummary(enrichment, options.expectedSummary);
    if (summaryErrors.length > 0) {
      return invalidResult(summaryErrors, warnings);
    }
  }

  return {
    valid: true,
    value: enrichment,
    warnings,
    errors: [],
  };
}
