import type { CareerBundleUnifiedSyncEnrichment, CareerSyncSignal } from "@devflow/career-sync";
import { validateCareerBundleUnifiedSyncEnrichment } from "@devflow/career-sync";
import type { ProviderDerivedEnrichmentProposal } from "./provider-derived-enrichment-proposal";

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

export type BuildProviderDerivedEnrichmentProposalExportInput = {
  proposal: ProviderDerivedEnrichmentProposal;
  exportedAt: string;
};

export type ProviderDerivedEnrichmentProposalExportResult = {
  status: "ready" | "invalid" | "error";
  safeForClient: true;
  downloadable: boolean;
  filename?: string;
  json?: string;
  warnings: string[];
  messages: string[];
};

const EXPORT_READY_MESSAGE =
  "Proposal downloaded locally. Nothing was saved or applied in ApplyFlow.";
const EXPORT_INVALID_MESSAGE = "The current proposal is not valid for download.";
const EXPORT_ERROR_MESSAGE = "The proposal could not be downloaded safely.";

const FORBIDDEN_JSON_KEYS = new Set([
  "access_token",
  "refresh_token",
  "client_secret",
  "authorization_code",
  "connectionId",
  "end_user_id",
  "providerPayload",
  "providerId",
  "messageId",
  "threadId",
  "eventId",
  "calendarId",
  "subject",
  "snippet",
  "body",
  "description",
  "location",
  "meetingLink",
  "attendeeEmail",
  "organizerEmail",
  "rawPayload",
  "rawMessage",
  "rawEvent",
]);

function isValidIsoTimestamp(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0 && Number.isFinite(Date.parse(value));
}

export function createProviderDerivedEnrichmentProposalFilename(
  exportedAt: string,
): string | undefined {
  if (!isValidIsoTimestamp(exportedAt)) {
    return undefined;
  }

  const sanitized = exportedAt.replace(/[:.]/g, "-");
  return `devflow-enrichment-proposal-${sanitized}.json`;
}

function createExportResult(input: {
  status: ProviderDerivedEnrichmentProposalExportResult["status"];
  downloadable: boolean;
  filename?: string;
  json?: string;
  warnings: string[];
  messages: string[];
}): ProviderDerivedEnrichmentProposalExportResult {
  return {
    status: input.status,
    safeForClient: true,
    downloadable: input.downloadable,
    filename: input.filename,
    json: input.json,
    warnings: input.warnings,
    messages: input.messages,
  };
}

function validateProposalForExport(proposal: ProviderDerivedEnrichmentProposal): string[] {
  const warnings: string[] = [];

  if (proposal.status !== "ready") {
    warnings.push("proposal_not_ready");
  }

  if (!proposal.enrichment) {
    warnings.push("proposal_missing_enrichment");
  }

  if (proposal.sourceSignalCount <= 0) {
    warnings.push("proposal_has_no_signals");
  }

  if (proposal.persisted !== false) {
    warnings.push("proposal_unsafe_flags");
  }

  if (proposal.appliedToCareerBundle !== false) {
    warnings.push("proposal_unsafe_flags");
  }

  if (proposal.appliedToApplications !== false) {
    warnings.push("proposal_unsafe_flags");
  }

  if (proposal.userReviewRequired !== true) {
    warnings.push("proposal_unsafe_flags");
  }

  if (!isValidIsoTimestamp(proposal.generatedAt)) {
    warnings.push("invalid_generated_at");
  }

  return warnings;
}

function serializeCareerSyncSignal(signal: CareerSyncSignal): CareerSyncSignal {
  const serialized: CareerSyncSignal = {
    id: signal.id,
    source: signal.source,
    confidence: signal.confidence,
    safeSummary: signal.safeSummary,
    rawRetained: false,
  };

  if (signal.companyHint != null) {
    serialized.companyHint = signal.companyHint;
  }

  if (signal.roleHint != null) {
    serialized.roleHint = signal.roleHint;
  }

  if (signal.processStage != null) {
    serialized.processStage = signal.processStage;
  }

  if (signal.actionRequired != null) {
    serialized.actionRequired = signal.actionRequired;
  }

  if (signal.receivedAt != null) {
    serialized.receivedAt = signal.receivedAt;
  }

  if (signal.eventAt != null) {
    serialized.eventAt = signal.eventAt;
  }

  return serialized;
}

function serializeCareerBundleUnifiedSyncEnrichment(
  enrichment: CareerBundleUnifiedSyncEnrichment,
): CareerBundleUnifiedSyncEnrichment {
  const serialized: CareerBundleUnifiedSyncEnrichment = {
    source: "sync",
    combinedSignals: enrichment.combinedSignals.map(serializeCareerSyncSignal),
    summary: enrichment.summary,
    stats: {
      totalSignals: enrichment.stats.totalSignals,
      actionRequiredCount: enrichment.stats.actionRequiredCount,
      upcomingCount: enrichment.stats.upcomingCount,
      stageCounts: { ...enrichment.stats.stageCounts },
      sourceCounts: {
        gmail: enrichment.stats.sourceCounts.gmail,
        calendar: enrichment.stats.sourceCounts.calendar,
      },
      companyHints: [...enrichment.stats.companyHints].sort((left, right) =>
        left.localeCompare(right),
      ),
    },
    generatedAt: enrichment.generatedAt,
    privacy: {
      rawRetained: false,
      redacted: true,
      meetingLinksRemoved: true,
      providerPayloadRetained: false,
      userReviewRequired: true,
    },
  };

  if (enrichment.gmail) {
    serialized.gmail = {
      source: "gmail",
      signals: enrichment.gmail.signals.map(serializeCareerSyncSignal),
      summary: enrichment.gmail.summary,
      generatedAt: enrichment.gmail.generatedAt,
      rawRetained: false,
    };
  }

  if (enrichment.calendar) {
    serialized.calendar = {
      source: "calendar",
      signals: enrichment.calendar.signals.map(serializeCareerSyncSignal),
      summary: enrichment.calendar.summary,
      generatedAt: enrichment.calendar.generatedAt,
      rawRetained: false,
    };
  }

  return serialized;
}

function buildExportDocument(input: {
  proposal: ProviderDerivedEnrichmentProposal;
  exportedAt: string;
}): ProviderDerivedEnrichmentProposalExport {
  const enrichment = serializeCareerBundleUnifiedSyncEnrichment(input.proposal.enrichment!);

  return {
    schema: PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_SCHEMA,
    version: PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_VERSION,
    exportedAt: input.exportedAt,
    generatedAt: input.proposal.generatedAt!,
    sourceSignalCount: input.proposal.sourceSignalCount,
    reviewRequired: true,
    persistedByApplyFlow: false,
    appliedToCareerBundle: false,
    appliedToApplications: false,
    enrichment,
  };
}

function hasForbiddenJsonKeys(value: unknown): boolean {
  if (value == null || typeof value !== "object") {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((entry) => hasForbiddenJsonKeys(entry));
  }

  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_JSON_KEYS.has(key)) {
      return true;
    }

    if (hasForbiddenJsonKeys(child)) {
      return true;
    }
  }

  return false;
}

export function assertExportJsonSafe(json: string): boolean {
  try {
    const parsed = JSON.parse(json) as unknown;
    return !hasForbiddenJsonKeys(parsed);
  } catch {
    return false;
  }
}

export function serializeProviderDerivedEnrichmentProposalExport(
  exportDocument: ProviderDerivedEnrichmentProposalExport,
): string {
  const orderedDocument: ProviderDerivedEnrichmentProposalExport = {
    schema: exportDocument.schema,
    version: exportDocument.version,
    exportedAt: exportDocument.exportedAt,
    generatedAt: exportDocument.generatedAt,
    sourceSignalCount: exportDocument.sourceSignalCount,
    reviewRequired: exportDocument.reviewRequired,
    persistedByApplyFlow: exportDocument.persistedByApplyFlow,
    appliedToCareerBundle: exportDocument.appliedToCareerBundle,
    appliedToApplications: exportDocument.appliedToApplications,
    enrichment: exportDocument.enrichment,
  };

  return `${JSON.stringify(orderedDocument, null, 2)}\n`;
}

export function buildProviderDerivedEnrichmentProposalExport(
  input: BuildProviderDerivedEnrichmentProposalExportInput,
): ProviderDerivedEnrichmentProposalExportResult {
  const proposalWarnings = validateProposalForExport(input.proposal);

  if (!isValidIsoTimestamp(input.exportedAt)) {
    return createExportResult({
      status: "invalid",
      downloadable: false,
      warnings: [...proposalWarnings, "invalid_exported_at"],
      messages: [EXPORT_INVALID_MESSAGE],
    });
  }

  if (proposalWarnings.length > 0) {
    return createExportResult({
      status: "invalid",
      downloadable: false,
      warnings: proposalWarnings,
      messages: [EXPORT_INVALID_MESSAGE],
    });
  }

  const enrichment = input.proposal.enrichment!;
  const validation = validateCareerBundleUnifiedSyncEnrichment(enrichment, {
    rejectProviderIdentifiers: true,
  });

  if (!validation.valid) {
    return createExportResult({
      status: "invalid",
      downloadable: false,
      warnings: ["invalid_enrichment", ...validation.errors, ...validation.warnings],
      messages: [EXPORT_INVALID_MESSAGE],
    });
  }

  try {
    const exportDocument = buildExportDocument({
      proposal: input.proposal,
      exportedAt: input.exportedAt,
    });
    const json = serializeProviderDerivedEnrichmentProposalExport(exportDocument);
    const filename = createProviderDerivedEnrichmentProposalFilename(input.exportedAt);

    if (!filename || !assertExportJsonSafe(json)) {
      return createExportResult({
        status: "error",
        downloadable: false,
        warnings: ["export_json_unsafe"],
        messages: [EXPORT_ERROR_MESSAGE],
      });
    }

    return createExportResult({
      status: "ready",
      downloadable: true,
      filename,
      json,
      warnings: validation.warnings,
      messages: [EXPORT_READY_MESSAGE],
    });
  } catch {
    return createExportResult({
      status: "error",
      downloadable: false,
      warnings: ["export_build_failed"],
      messages: [EXPORT_ERROR_MESSAGE],
    });
  }
}

export function canExportEnrichmentProposal(input: {
  proposal: ProviderDerivedEnrichmentProposal | null;
  isProposalStale: boolean;
}): boolean {
  if (input.isProposalStale || input.proposal == null) {
    return false;
  }

  return (
    input.proposal.status === "ready" &&
    input.proposal.enrichment != null &&
    input.proposal.sourceSignalCount > 0
  );
}
