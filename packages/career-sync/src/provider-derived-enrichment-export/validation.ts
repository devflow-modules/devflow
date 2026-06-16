import { validateCareerBundleUnifiedSyncEnrichment } from "../unified-sync-enrichment/validation.js";
import { collectForbiddenKeysInDocument } from "./forbidden-keys.js";
import {
  PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_DOCUMENT_KEYS,
  PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_SCHEMA,
  PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_VERSION,
  type ProviderDerivedEnrichmentProposalExport,
  type ProviderDerivedEnrichmentProposalExportValidationResult,
} from "./types.js";

const ALLOWED_ROOT_KEYS = new Set<string>(PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_DOCUMENT_KEYS);

function invalidResult(
  errors: string[],
  warnings: string[] = [],
): ProviderDerivedEnrichmentProposalExportValidationResult {
  return {
    valid: false,
    warnings,
    errors,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isCanonicalUtcIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }

  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return false;
  }

  return new Date(value).toISOString() === value;
}

function isValidSourceSignalCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && Number.isFinite(value);
}

function collectUnexpectedRootFields(candidate: Record<string, unknown>): string[] {
  return Object.keys(candidate)
    .filter((key) => !ALLOWED_ROOT_KEYS.has(key))
    .sort((left, right) => left.localeCompare(right))
    .map((key) => `unexpected_root_field:${key}`);
}

function prefixEnrichmentErrors(errors: string[]): string[] {
  return errors.map((error) => `enrichment:${error}`);
}

export function validateProviderDerivedEnrichmentProposalExportV1(
  value: unknown,
): ProviderDerivedEnrichmentProposalExportValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isPlainObject(value)) {
    errors.push("invalid_schema");
    errors.push("unsupported_version");
    errors.push("invalid_exported_at");
    errors.push("invalid_generated_at");
    errors.push("invalid_source_signal_count");
    errors.push("review_required_must_be_true");
    errors.push("persisted_by_applyflow_must_be_false");
    errors.push("applied_to_career_bundle_must_be_false");
    errors.push("applied_to_applications_must_be_false");
    errors.push("invalid_enrichment");
    return invalidResult(errors, warnings);
  }

  const candidate = value;

  if (candidate.schema !== PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_SCHEMA) {
    errors.push("invalid_schema");
  }

  if (candidate.version !== PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_VERSION) {
    errors.push("unsupported_version");
  }

  errors.push(...collectUnexpectedRootFields(candidate));

  if (!isCanonicalUtcIsoTimestamp(candidate.exportedAt)) {
    errors.push("invalid_exported_at");
  }

  if (!isCanonicalUtcIsoTimestamp(candidate.generatedAt)) {
    errors.push("invalid_generated_at");
  }

  if (!isValidSourceSignalCount(candidate.sourceSignalCount)) {
    errors.push("invalid_source_signal_count");
  }

  if (candidate.reviewRequired !== true) {
    errors.push("review_required_must_be_true");
  }

  if (candidate.persistedByApplyFlow !== false) {
    errors.push("persisted_by_applyflow_must_be_false");
  }

  if (candidate.appliedToCareerBundle !== false) {
    errors.push("applied_to_career_bundle_must_be_false");
  }

  if (candidate.appliedToApplications !== false) {
    errors.push("applied_to_applications_must_be_false");
  }

  for (const forbiddenKey of collectForbiddenKeysInDocument(candidate)) {
    errors.push(`forbidden_key:${forbiddenKey}`);
  }

  if (candidate.enrichment == null) {
    errors.push("invalid_enrichment");
  } else {
    const enrichmentValidation = validateCareerBundleUnifiedSyncEnrichment(candidate.enrichment, {
      rejectProviderIdentifiers: true,
    });

    warnings.push(...enrichmentValidation.warnings);

    if (!enrichmentValidation.valid) {
      errors.push("invalid_enrichment");
      errors.push(...prefixEnrichmentErrors(enrichmentValidation.errors));
    }
  }

  if (errors.length > 0) {
    return invalidResult(errors, warnings);
  }

  return {
    valid: true,
    value: value as ProviderDerivedEnrichmentProposalExport,
    warnings,
    errors: [],
  };
}

export function validateProviderDerivedEnrichmentProposalExport(
  value: unknown,
): ProviderDerivedEnrichmentProposalExportValidationResult {
  if (!isPlainObject(value)) {
    return validateProviderDerivedEnrichmentProposalExportV1(value);
  }

  if (value.schema !== PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_SCHEMA) {
    return invalidResult(["invalid_schema"]);
  }

  if (value.version !== PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_VERSION) {
    return invalidResult(["unsupported_version"]);
  }

  return validateProviderDerivedEnrichmentProposalExportV1(value);
}
