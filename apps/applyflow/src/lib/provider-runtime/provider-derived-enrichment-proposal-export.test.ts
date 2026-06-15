import { describe, expect, it } from "vitest";
import type { ProviderDerivedSignal } from "@devflow/career-sync";
import {
  initializeProviderDerivedRuntimeReview,
  markProviderDerivedSelectionReady,
  toggleProviderDerivedSignalSelection,
  type ProviderDerivedRuntimeReviewablePreviewResult,
} from "@/components/dashboard/provider-derived-runtime-review-state";
import { buildProviderDerivedEnrichmentProposal, type ProviderDerivedEnrichmentProposal } from "./provider-derived-enrichment-proposal";
import {
  PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_SCHEMA,
  PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_VERSION,
  assertExportJsonSafe,
  buildProviderDerivedEnrichmentProposalExport,
  createProviderDerivedEnrichmentProposalFilename,
  isSelectedSignalIdSafeForExport,
} from "./provider-derived-enrichment-proposal-export";

const generatedAt = "2026-06-15T12:00:00.000Z";
const exportedAt = "2026-06-15T18:30:00.000Z";

function createSignal(
  overrides: Partial<ProviderDerivedSignal> & Pick<ProviderDerivedSignal, "id" | "source" | "kind" | "occurredAt">,
): ProviderDerivedSignal {
  return {
    confidence: 0.85,
    reviewRequired: true,
    sourceCount: 1,
    ...overrides,
  };
}

function createPreviewResult(): ProviderDerivedRuntimeReviewablePreviewResult {
  return {
    status: "completed",
    processedMessageCount: 2,
    processedEventCount: 1,
    signals: [
      createSignal({
        id: "gmail-sandbox-follow_up_required-2026-06-12T10-00-00-000Z-0",
        source: "gmail",
        kind: "follow_up_required",
        occurredAt: "2026-06-12T10:00:00.000Z",
        company: "Acme",
      }),
      createSignal({
        id: "calendar-sandbox-interview_scheduled-2026-06-20T14-00-00-000Z-0",
        source: "calendar",
        kind: "interview_scheduled",
        occurredAt: "2026-06-20T14:00:00.000Z",
        startsAt: "2026-06-20T14:00:00.000Z",
        company: "Beta",
      }),
    ],
  };
}

function readyProposal(): ProviderDerivedEnrichmentProposal {
  const preview = createPreviewResult();
  const initialized = initializeProviderDerivedRuntimeReview(preview);
  const selected = toggleProviderDerivedSignalSelection(
    initialized,
    "gmail-sandbox-follow_up_required-2026-06-12T10-00-00-000Z-0",
    preview.signals,
  );
  const selectedBoth = toggleProviderDerivedSignalSelection(
    selected,
    "calendar-sandbox-interview_scheduled-2026-06-20T14-00-00-000Z-0",
    preview.signals,
  );

  return buildProviderDerivedEnrichmentProposal({
    previewResult: preview,
    reviewState: markProviderDerivedSelectionReady(selectedBoth),
    generatedAt,
  });
}

describe("isSelectedSignalIdSafeForExport", () => {
  it("accepts deterministic internal derived IDs", () => {
    expect(isSelectedSignalIdSafeForExport("gmail-sandbox-follow_up_required-2026-06-12T10-00-00-000Z-0")).toBe(
      true,
    );
  });

  it("rejects provider-like IDs", () => {
    expect(isSelectedSignalIdSafeForExport("nango-sandbox-message-001")).toBe(false);
    expect(isSelectedSignalIdSafeForExport("threadId-abc")).toBe(false);
  });
});

describe("createProviderDerivedEnrichmentProposalFilename", () => {
  it("creates deterministic safe filename", () => {
    expect(createProviderDerivedEnrichmentProposalFilename(exportedAt)).toBe(
      "devflow-enrichment-proposal-2026-06-15T18-30-00-000Z.json",
    );
  });

  it("returns undefined for invalid exportedAt", () => {
    expect(createProviderDerivedEnrichmentProposalFilename("not-a-date")).toBeUndefined();
  });
});

describe("buildProviderDerivedEnrichmentProposalExport", () => {
  it("exports ready proposal with stable JSON", () => {
    const proposal = readyProposal();
    const result = buildProviderDerivedEnrichmentProposalExport({ proposal, exportedAt });

    expect(result.status).toBe("ready");
    expect(result.downloadable).toBe(true);
    expect(result.filename).toBe("devflow-enrichment-proposal-2026-06-15T18-30-00-000Z.json");
    expect(result.json).toMatch(/\n$/);
    expect(result.json).toBe(`${result.json?.trimEnd()}\n`);

    const parsed = JSON.parse(result.json!);
    expect(parsed.schema).toBe(PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_SCHEMA);
    expect(parsed.version).toBe(PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_VERSION);
    expect(parsed.exportedAt).toBe(exportedAt);
    expect(parsed.generatedAt).toBe(generatedAt);
    expect(parsed.reviewRequired).toBe(true);
    expect(parsed.persistedByApplyFlow).toBe(false);
    expect(parsed.appliedToCareerBundle).toBe(false);
    expect(parsed.appliedToApplications).toBe(false);
    expect(parsed.enrichment.privacy.rawRetained).toBe(false);
    expect(parsed.enrichment.combinedSignals.every((signal: { providerId?: string }) => signal.providerId == null)).toBe(
      true,
    );
    expect(assertExportJsonSafe(result.json!)).toBe(true);
  });

  it("returns invalid for non-ready proposal statuses", () => {
    const proposal = readyProposal();

    for (const status of ["idle", "invalid", "error"] as const) {
      const result = buildProviderDerivedEnrichmentProposalExport({
        proposal: { ...proposal, status },
        exportedAt,
      });

      expect(result.status).toBe("invalid");
      expect(result.downloadable).toBe(false);
      expect(result.warnings).toContain("proposal_not_ready");
    }
  });

  it("returns invalid when enrichment is missing", () => {
    const proposal = { ...readyProposal(), enrichment: undefined };
    const result = buildProviderDerivedEnrichmentProposalExport({ proposal, exportedAt });

    expect(result.warnings).toContain("proposal_missing_enrichment");
  });

  it("returns invalid when sourceSignalCount is zero", () => {
    const proposal = { ...readyProposal(), sourceSignalCount: 0 };
    const result = buildProviderDerivedEnrichmentProposalExport({ proposal, exportedAt });

    expect(result.warnings).toContain("proposal_has_no_signals");
  });

  it("returns invalid for unsafe proposal flags", () => {
    const base = readyProposal();
    const persisted = buildProviderDerivedEnrichmentProposalExport({
      proposal: { ...base, persisted: true } as ProviderDerivedEnrichmentProposal,
      exportedAt,
    });
    const appliedBundle = buildProviderDerivedEnrichmentProposalExport({
      proposal: { ...base, appliedToCareerBundle: true } as ProviderDerivedEnrichmentProposal,
      exportedAt,
    });
    const appliedApps = buildProviderDerivedEnrichmentProposalExport({
      proposal: { ...base, appliedToApplications: true } as ProviderDerivedEnrichmentProposal,
      exportedAt,
    });
    const reviewOff = buildProviderDerivedEnrichmentProposalExport({
      proposal: { ...base, userReviewRequired: false } as ProviderDerivedEnrichmentProposal,
      exportedAt,
    });

    expect(persisted.warnings).toContain("proposal_unsafe_flags");
    expect(appliedBundle.warnings).toContain("proposal_unsafe_flags");
    expect(appliedApps.warnings).toContain("proposal_unsafe_flags");
    expect(reviewOff.warnings).toContain("proposal_unsafe_flags");
  });

  it("returns invalid for invalid timestamps", () => {
    const proposal = readyProposal();

    expect(
      buildProviderDerivedEnrichmentProposalExport({
        proposal: { ...proposal, generatedAt: "invalid" },
        exportedAt,
      }).warnings,
    ).toContain("invalid_generated_at");

    expect(
      buildProviderDerivedEnrichmentProposalExport({
        proposal,
        exportedAt: "invalid",
      }).warnings,
    ).toContain("invalid_exported_at");
  });

  it("returns invalid for unsafe selected signal IDs", () => {
    const proposal = {
      ...readyProposal(),
      selectedSignalIds: ["nango-sandbox-message-001"],
    };

    expect(
      buildProviderDerivedEnrichmentProposalExport({ proposal, exportedAt }).warnings,
    ).toContain("selected_signal_id_unsafe");
  });

  it("is deterministic for the same input", () => {
    const proposal = readyProposal();
    const input = { proposal, exportedAt };

    expect(buildProviderDerivedEnrichmentProposalExport(input)).toEqual(
      buildProviderDerivedEnrichmentProposalExport(input),
    );
  });

  it("does not mutate proposal input", () => {
    const proposal = readyProposal();
    const frozen = structuredClone(proposal);

    buildProviderDerivedEnrichmentProposalExport({ proposal, exportedAt });

    expect(proposal).toEqual(frozen);
  });

  it("does not include proposal warnings or messages in export JSON", () => {
    const proposal = {
      ...readyProposal(),
      warnings: ["internal_warning"],
      messages: ["internal_message"],
    };
    const result = buildProviderDerivedEnrichmentProposalExport({ proposal, exportedAt });

    expect(result.json).not.toContain("internal_warning");
    expect(result.json).not.toContain("internal_message");
    expect(JSON.parse(result.json!).warnings).toBeUndefined();
  });

  it("allowlists export document keys only", () => {
    const result = buildProviderDerivedEnrichmentProposalExport({
      proposal: readyProposal(),
      exportedAt,
    });
    const parsed = JSON.parse(result.json!) as Record<string, unknown>;

    expect(Object.keys(parsed).sort()).toEqual(
      [
        "appliedToApplications",
        "appliedToCareerBundle",
        "enrichment",
        "exportedAt",
        "generatedAt",
        "persistedByApplyFlow",
        "reviewRequired",
        "schema",
        "selectedSignalIds",
        "sourcePreviewFingerprint",
        "sourceSignalCount",
        "version",
      ].sort(),
    );
  });
});
