import { describe, expect, it } from "vitest";
import type { CareerSyncSignal, ProviderDerivedSignal } from "@devflow/career-sync";
import {
  initializeProviderDerivedRuntimeReview,
  markProviderDerivedSelectionReady,
  toggleProviderDerivedSignalSelection,
  type ProviderDerivedRuntimeReviewablePreviewResult,
} from "@/components/dashboard/provider-derived-runtime-review-state";
import { buildProviderDerivedEnrichmentProposal, type ProviderDerivedEnrichmentProposal } from "./provider-derived-enrichment-proposal";
import {
  PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_DOCUMENT_KEYS,
  PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_SCHEMA,
  PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_VERSION,
  assertExportJsonSafe,
  buildProviderDerivedEnrichmentProposalExport,
  createProviderDerivedEnrichmentProposalFilename,
  serializeProviderDerivedEnrichmentProposalExport,
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

describe("createProviderDerivedEnrichmentProposalFilename", () => {
  it("creates deterministic safe filename", () => {
    expect(createProviderDerivedEnrichmentProposalFilename(exportedAt)).toBe(
      "devflow-enrichment-proposal-2026-06-15T18-30-00-000Z.json",
    );
    expect(createProviderDerivedEnrichmentProposalFilename(exportedAt)).not.toMatch(/[:/\\ ]/);
    expect(createProviderDerivedEnrichmentProposalFilename(exportedAt)).toMatch(/\.json$/);
  });

  it("returns undefined for invalid exportedAt", () => {
    expect(createProviderDerivedEnrichmentProposalFilename("not-a-date")).toBeUndefined();
    expect(createProviderDerivedEnrichmentProposalFilename("")).toBeUndefined();
  });
});

describe("assertExportJsonSafe", () => {
  it("rejects nested forbidden keys", () => {
    expect(
      assertExportJsonSafe(
        JSON.stringify({
          nested: {
            access_token: "x",
          },
        }),
      ),
    ).toBe(false);
  });

  it("allows legitimate values containing forbidden substrings when keys are safe", () => {
    expect(
      assertExportJsonSafe(
        JSON.stringify({
          enrichment: {
            summary: "Interview location confirmed for next week",
          },
        }),
      ),
    ).toBe(true);
  });

  it("rejects forbidden top-level keys", () => {
    expect(assertExportJsonSafe(JSON.stringify({ providerId: "abc" }))).toBe(false);
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

  it("uses exact schema and version literals", () => {
    const result = buildProviderDerivedEnrichmentProposalExport({
      proposal: readyProposal(),
      exportedAt,
    });
    const parsed = JSON.parse(result.json!) as Record<string, unknown>;

    expect(parsed.schema).toBe("devflow.provider-derived-enrichment-proposal");
    expect(parsed.version).toBe(1);
    expect(typeof parsed.schema).toBe("string");
    expect(typeof parsed.version).toBe("number");
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

    expect(
      buildProviderDerivedEnrichmentProposalExport({
        proposal,
        exportedAt: "",
      }).warnings,
    ).toContain("invalid_exported_at");
  });

  it("returns invalid when enrichment validation fails on provider identifiers", () => {
    const proposal = readyProposal();
    const enrichment = structuredClone(proposal.enrichment!);
    enrichment.combinedSignals = enrichment.combinedSignals.map((signal) => ({
      ...signal,
      providerId: "provider-message-001",
    })) as CareerSyncSignal[];

    const result = buildProviderDerivedEnrichmentProposalExport({
      proposal: { ...proposal, enrichment },
      exportedAt,
    });

    expect(result.status).toBe("invalid");
    expect(result.warnings).toContain("invalid_enrichment");
  });

  it("is deterministic for the same input", () => {
    const proposal = readyProposal();
    const input = { proposal, exportedAt };

    expect(buildProviderDerivedEnrichmentProposalExport(input)).toEqual(
      buildProviderDerivedEnrichmentProposalExport(input),
    );
  });

  it("sorts companyHints for deterministic JSON", () => {
    const proposal = readyProposal();
    const enrichment = structuredClone(proposal.enrichment!);
    enrichment.stats.companyHints = ["Zeta", "Acme"];

    const result = buildProviderDerivedEnrichmentProposalExport({
      proposal: { ...proposal, enrichment },
      exportedAt,
    });

    expect(JSON.parse(result.json!).enrichment.stats.companyHints).toEqual(["Acme", "Zeta"]);
  });

  it("does not mutate proposal input", () => {
    const proposal = readyProposal();
    const frozen = structuredClone(proposal);

    buildProviderDerivedEnrichmentProposalExport({ proposal, exportedAt });

    expect(proposal).toEqual(frozen);
  });

  it("does not include proposal warnings, messages, or UI-only fields in export JSON", () => {
    const proposal = {
      ...readyProposal(),
      warnings: ["internal_warning"],
      messages: ["internal_message"],
      sourcePreviewFingerprint: "ui-only-fingerprint",
      selectedSignalIds: ["gmail-sandbox-follow_up_required-2026-06-12T10-00-00-000Z-0"],
    };
    const result = buildProviderDerivedEnrichmentProposalExport({ proposal, exportedAt });
    const parsed = JSON.parse(result.json!) as Record<string, unknown>;

    expect(result.json).not.toContain("internal_warning");
    expect(result.json).not.toContain("internal_message");
    expect(parsed.warnings).toBeUndefined();
    expect(parsed.sourcePreviewFingerprint).toBeUndefined();
    expect(parsed.selectedSignalIds).toBeUndefined();
  });

  it("allowlists export document keys only", () => {
    const result = buildProviderDerivedEnrichmentProposalExport({
      proposal: readyProposal(),
      exportedAt,
    });
    const parsed = JSON.parse(result.json!) as Record<string, unknown>;

    expect(Object.keys(parsed).sort()).toEqual([...PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_DOCUMENT_KEYS].sort());
  });

  it("round-trips JSON parse validation without import support", () => {
    const result = buildProviderDerivedEnrichmentProposalExport({
      proposal: readyProposal(),
      exportedAt,
    });
    const parsed = JSON.parse(result.json!) as Record<string, unknown>;

    expect(parsed).toEqual(expect.objectContaining({
      schema: PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_SCHEMA,
      version: PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_VERSION,
    }));
    expect(Object.keys(parsed).sort()).toEqual([...PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_DOCUMENT_KEYS].sort());
  });

  it("serializes export document with fixed top-level property order", () => {
    const proposal = readyProposal();
    const exportDocument = {
      schema: PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_SCHEMA,
      version: PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_VERSION,
      exportedAt,
      generatedAt,
      sourceSignalCount: proposal.sourceSignalCount,
      reviewRequired: true as const,
      persistedByApplyFlow: false as const,
      appliedToCareerBundle: false as const,
      appliedToApplications: false as const,
      enrichment: proposal.enrichment!,
    };

    const json = serializeProviderDerivedEnrichmentProposalExport(exportDocument);
    const keyOrder = [...json.matchAll(/^  "([^"]+)":/gm)].map((match) => match[1]).slice(0, 10);

    expect(keyOrder).toEqual([...PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_DOCUMENT_KEYS]);
  });
});
