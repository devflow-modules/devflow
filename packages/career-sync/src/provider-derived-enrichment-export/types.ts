import type { CareerBundleUnifiedSyncEnrichment } from "../career-bundle/types.js";

export const PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_SCHEMA =
  "devflow.provider-derived-enrichment-proposal" as const;

export const PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_VERSION = 1 as const;

export const PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_DOCUMENT_KEYS = [
  "schema",
  "version",
  "exportedAt",
  "generatedAt",
  "sourceSignalCount",
  "reviewRequired",
  "persistedByApplyFlow",
  "appliedToCareerBundle",
  "appliedToApplications",
  "enrichment",
] as const;

export type ProviderDerivedEnrichmentProposalExport = {
  schema: typeof PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_SCHEMA;
  version: typeof PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_VERSION;
  exportedAt: string;
  generatedAt: string;
  sourceSignalCount: number;
  reviewRequired: true;
  persistedByApplyFlow: false;
  appliedToCareerBundle: false;
  appliedToApplications: false;
  enrichment: CareerBundleUnifiedSyncEnrichment;
};

export type ProviderDerivedEnrichmentProposalExportValidationResult =
  | {
      valid: true;
      value: ProviderDerivedEnrichmentProposalExport;
      warnings: string[];
      errors: [];
    }
  | {
      valid: false;
      warnings: string[];
      errors: string[];
    };
