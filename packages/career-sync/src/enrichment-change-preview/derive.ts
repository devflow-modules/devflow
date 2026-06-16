import type { CareerBundleUnifiedSyncEnrichment } from "../unified-sync-enrichment/types.js";
import type { SyncConfidence } from "../shared/types.js";
import {
  areListsDisjointNonEmpty,
  displayValuesEqual,
  isConfidenceInsufficient,
  isEmptyDisplayValue,
  isListSuperset,
  normalizeCompanyHints,
  resolveLowestConfidence,
  toSafeList,
  toSafeNumber,
  toSafeString,
} from "./normalize.js";
import { assertEnrichmentChangePreviewSafe } from "./safety.js";
import {
  ENRICHMENT_CHANGE_PREVIEW_FIELDS,
  ENRICHMENT_CHANGE_PREVIEW_MAX_ITEMS,
  ENRICHMENT_CHANGE_PREVIEW_MAX_WARNINGS_PER_ITEM,
  type DeriveEnrichmentChangePreviewInput,
  type EnrichmentChangePreviewField,
  type EnrichmentChangePreviewItem,
  type EnrichmentChangePreviewResult,
  type EnrichmentChangePreviewStatus,
  type SafeDisplayValue,
} from "./types.js";

const FIELD_LABELS: Record<EnrichmentChangePreviewField, string> = {
  "stats.totalSignals": "Total derived signals",
  "stats.actionRequiredCount": "Actions required",
  "stats.upcomingCount": "Upcoming events",
  "stats.sourceCounts.gmail": "Gmail signal count",
  "stats.sourceCounts.calendar": "Calendar signal count",
  "stats.companyHints": "Company hints",
  "combinedSignals.count": "Combined signal count",
  summary: "Enrichment summary",
};

function createEmptyStatusCounts(): Record<EnrichmentChangePreviewStatus, number> {
  return {
    unchanged: 0,
    missing_current_value: 0,
    additive_suggestion: 0,
    replacement_suggestion: 0,
    conflict: 0,
    unsupported: 0,
    insufficient_confidence: 0,
    excluded_by_user: 0,
  };
}

function activeProposedSignals(
  proposed: CareerBundleUnifiedSyncEnrichment,
  excludedSignalIds: ReadonlySet<string>,
) {
  return proposed.combinedSignals.filter((signal) => !excludedSignalIds.has(signal.id));
}

function resolveFieldConfidence(
  proposed: CareerBundleUnifiedSyncEnrichment,
  excludedSignalIds: ReadonlySet<string>,
): SyncConfidence | undefined {
  return resolveLowestConfidence(
    activeProposedSignals(proposed, excludedSignalIds).map((signal) => signal.confidence),
  );
}

function classifyScalarChange(input: {
  current: SafeDisplayValue;
  suggested: SafeDisplayValue;
  confidence?: SyncConfidence;
  excludedByUser: boolean;
}): EnrichmentChangePreviewStatus {
  if (input.excludedByUser) {
    return "excluded_by_user";
  }

  if (isConfidenceInsufficient(input.confidence)) {
    return "insufficient_confidence";
  }

  if (displayValuesEqual(input.current, input.suggested)) {
    return "unchanged";
  }

  if (isEmptyDisplayValue(input.current) && !isEmptyDisplayValue(input.suggested)) {
    return "missing_current_value";
  }

  if (!isEmptyDisplayValue(input.current) && !isEmptyDisplayValue(input.suggested)) {
    return "replacement_suggestion";
  }

  return "unchanged";
}

function classifyListChange(input: {
  current: SafeDisplayValue;
  suggested: SafeDisplayValue;
  confidence?: SyncConfidence;
  excludedByUser: boolean;
}): EnrichmentChangePreviewStatus {
  if (input.excludedByUser) {
    return "excluded_by_user";
  }

  if (isConfidenceInsufficient(input.confidence)) {
    return "insufficient_confidence";
  }

  if (displayValuesEqual(input.current, input.suggested)) {
    return "unchanged";
  }

  if (isEmptyDisplayValue(input.current) && !isEmptyDisplayValue(input.suggested)) {
    return "missing_current_value";
  }

  if (input.current.kind === "list" && input.suggested.kind === "list") {
    if (isListSuperset(input.current.value, input.suggested.value)) {
      return "additive_suggestion";
    }

    if (areListsDisjointNonEmpty(input.current.value, input.suggested.value)) {
      return "conflict";
    }

    return "replacement_suggestion";
  }

  return "replacement_suggestion";
}

function buildItem(input: {
  field: EnrichmentChangePreviewField;
  current: SafeDisplayValue;
  suggested: SafeDisplayValue;
  status: EnrichmentChangePreviewStatus;
  confidence?: SyncConfidence;
  sourceSignalCount: number;
  warnings?: string[];
}): EnrichmentChangePreviewItem {
  return {
    field: input.field,
    label: FIELD_LABELS[input.field],
    status: input.status,
    currentValue: input.current,
    suggestedValue: input.suggested,
    confidence: input.confidence,
    sourceSignalCount: input.sourceSignalCount,
    warnings: (input.warnings ?? []).slice(0, ENRICHMENT_CHANGE_PREVIEW_MAX_WARNINGS_PER_ITEM),
  };
}

function deriveItems(input: {
  current: CareerBundleUnifiedSyncEnrichment | null;
  proposed: CareerBundleUnifiedSyncEnrichment;
  excludedSignalIds: ReadonlySet<string>;
}): EnrichmentChangePreviewItem[] {
  const confidence = resolveFieldConfidence(input.proposed, input.excludedSignalIds);
  const sourceSignalCount = activeProposedSignals(input.proposed, input.excludedSignalIds).length;
  const excludedByUser = sourceSignalCount === 0 && input.proposed.combinedSignals.length > 0;

  const currentStats = input.current?.stats;
  const proposedStats = input.proposed.stats;

  const currentHints = normalizeCompanyHints(currentStats?.companyHints ?? []);
  const proposedHints = normalizeCompanyHints(proposedStats.companyHints ?? []);

  const scalarFields: Array<{
    field: EnrichmentChangePreviewField;
    current: SafeDisplayValue;
    suggested: SafeDisplayValue;
  }> = [
    {
      field: "stats.totalSignals",
      current: toSafeNumber(currentStats?.totalSignals),
      suggested: toSafeNumber(proposedStats.totalSignals),
    },
    {
      field: "stats.actionRequiredCount",
      current: toSafeNumber(currentStats?.actionRequiredCount),
      suggested: toSafeNumber(proposedStats.actionRequiredCount),
    },
    {
      field: "stats.upcomingCount",
      current: toSafeNumber(currentStats?.upcomingCount),
      suggested: toSafeNumber(proposedStats.upcomingCount),
    },
    {
      field: "stats.sourceCounts.gmail",
      current: toSafeNumber(currentStats?.sourceCounts.gmail),
      suggested: toSafeNumber(proposedStats.sourceCounts.gmail),
    },
    {
      field: "stats.sourceCounts.calendar",
      current: toSafeNumber(currentStats?.sourceCounts.calendar),
      suggested: toSafeNumber(proposedStats.sourceCounts.calendar),
    },
    {
      field: "combinedSignals.count",
      current: toSafeNumber(input.current?.combinedSignals.length),
      suggested: toSafeNumber(input.proposed.combinedSignals.length),
    },
  ];

  const items: EnrichmentChangePreviewItem[] = scalarFields.map((entry) =>
    buildItem({
      field: entry.field,
      current: entry.current,
      suggested: entry.suggested,
      status: classifyScalarChange({
        current: entry.current,
        suggested: entry.suggested,
        confidence,
        excludedByUser,
      }),
      confidence,
      sourceSignalCount,
    }),
  );

  const currentList = toSafeList(currentHints);
  const suggestedList = toSafeList(proposedHints);

  items.push(
    buildItem({
      field: "stats.companyHints",
      current: currentList,
      suggested: suggestedList,
      status: classifyListChange({
        current: currentList,
        suggested: suggestedList,
        confidence,
        excludedByUser,
      }),
      confidence,
      sourceSignalCount,
    }),
  );

  const currentSummary = toSafeString(input.current?.summary);
  const suggestedSummary = toSafeString(input.proposed.summary);

  items.push(
    buildItem({
      field: "summary",
      current: currentSummary,
      suggested: suggestedSummary,
      status: classifyScalarChange({
        current: currentSummary,
        suggested: suggestedSummary,
        confidence,
        excludedByUser,
      }),
      confidence,
      sourceSignalCount,
    }),
  );

  return items
    .sort((left, right) => left.field.localeCompare(right.field))
    .slice(0, ENRICHMENT_CHANGE_PREVIEW_MAX_ITEMS);
}

function summarizeStatusCounts(items: readonly EnrichmentChangePreviewItem[]) {
  const counts = createEmptyStatusCounts();

  for (const item of items) {
    counts[item.status] += 1;
  }

  return counts;
}

function resolveResultStatus(
  items: readonly EnrichmentChangePreviewItem[],
): EnrichmentChangePreviewResult["status"] {
  if (items.length === 0) {
    return "empty";
  }

  if (items.every((item) => item.status === "unsupported")) {
    return "unsupported";
  }

  if (items.every((item) => item.status === "unchanged")) {
    return "ready";
  }

  return "ready";
}

/**
 * Deterministic read-only comparison between current and proposed sync enrichment.
 * Does not mutate input, persist data, or apply changes.
 */
export function deriveEnrichmentChangePreview(
  input: DeriveEnrichmentChangePreviewInput,
): EnrichmentChangePreviewResult {
  const excludedSignalIds = new Set(input.excludedSignalIds ?? []);

  if (input.proposed == null) {
    return {
      status: "invalid",
      safeForClient: true,
      readOnly: true,
      appliedToCareerBundle: false,
      appliedToApplications: false,
      persisted: false,
      items: [],
      statusCounts: createEmptyStatusCounts(),
      messages: ["No proposed enrichment is available for change preview."],
      warnings: ["proposal_missing"],
    };
  }

  const items = deriveItems({
    current: input.current ?? null,
    proposed: input.proposed,
    excludedSignalIds,
  });

  const statusCounts = summarizeStatusCounts(items);
  const hasChanges = items.some(
    (item) =>
      item.status !== "unchanged" &&
      item.status !== "unsupported" &&
      item.status !== "excluded_by_user",
  );

  const result: EnrichmentChangePreviewResult = {
    status: resolveResultStatus(items),
    safeForClient: true,
    readOnly: true,
    appliedToCareerBundle: false,
    appliedToApplications: false,
    persisted: false,
    items,
    statusCounts,
    messages: hasChanges
      ? ["Change preview shows suggested differences only. Nothing was applied."]
      : ["No differences detected between current and proposed enrichment."],
    warnings: [],
  };

  assertEnrichmentChangePreviewSafe(result);
  return result;
}
