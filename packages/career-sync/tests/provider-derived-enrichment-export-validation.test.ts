import { describe, expect, it } from "vitest";
import {
  buildCareerBundleCalendarEnrichment,
  buildCareerBundleGmailEnrichment,
  buildCareerBundleSyncEnrichment,
  buildCalendarSyncPreview,
  buildGmailSyncPreview,
  sampleInterviewCalendarEvent,
  sampleInterviewInviteEmail,
  sampleRecruiterEmail,
  sampleTechnicalCalendarEvent,
  validateProviderDerivedEnrichmentProposalExport,
  validateProviderDerivedEnrichmentProposalExportV1,
  type CareerBundleUnifiedSyncEnrichment,
  type ProviderDerivedEnrichmentProposalExport,
} from "../src/index.js";

const EXPORTED_AT = "2026-06-15T18:30:00.000Z";
const GENERATED_AT = "2026-06-15T12:00:00.000Z";
const FIXED_NOW = "2026-06-09T12:00:00.000Z";

function stripProviderIdentifiers(
  enrichment: CareerBundleUnifiedSyncEnrichment,
): CareerBundleUnifiedSyncEnrichment {
  const stripSignal = (signal: CareerBundleUnifiedSyncEnrichment["combinedSignals"][number]) => {
    const { providerId: _providerId, ...safeSignal } = signal as typeof signal & {
      providerId?: string;
    };
    return safeSignal;
  };

  return {
    ...enrichment,
    combinedSignals: enrichment.combinedSignals.map(stripSignal),
    gmail: enrichment.gmail
      ? {
          ...enrichment.gmail,
          signals: enrichment.gmail.signals.map(stripSignal),
        }
      : undefined,
    calendar: enrichment.calendar
      ? {
          ...enrichment.calendar,
          signals: enrichment.calendar.signals.map(stripSignal),
        }
      : undefined,
  };
}

function buildSafeSyncEnrichment(): CareerBundleUnifiedSyncEnrichment {
  const gmailPreview = buildGmailSyncPreview({
    messages: [sampleRecruiterEmail, sampleInterviewInviteEmail],
  });
  const calendarPreview = buildCalendarSyncPreview(
    { events: [sampleInterviewCalendarEvent, sampleTechnicalCalendarEvent] },
    { now: FIXED_NOW },
  );
  const gmail = buildCareerBundleGmailEnrichment(gmailPreview.signals, {
    generatedAt: GENERATED_AT,
  });
  const calendar = buildCareerBundleCalendarEnrichment(calendarPreview.signals, {
    generatedAt: GENERATED_AT,
  });
  return stripProviderIdentifiers(
    buildCareerBundleSyncEnrichment(
      { gmail, calendar },
      { now: FIXED_NOW, generatedAt: GENERATED_AT },
    ),
  );
}

function buildValidExportDocument(
  overrides: Partial<ProviderDerivedEnrichmentProposalExport> = {},
): ProviderDerivedEnrichmentProposalExport {
  return {
    schema: "devflow.provider-derived-enrichment-proposal",
    version: 1,
    exportedAt: EXPORTED_AT,
    generatedAt: GENERATED_AT,
    sourceSignalCount: 2,
    reviewRequired: true,
    persistedByApplyFlow: false,
    appliedToCareerBundle: false,
    appliedToApplications: false,
    enrichment: buildSafeSyncEnrichment(),
    ...overrides,
  };
}

function deepFreeze<T>(value: T): T {
  if (value == null || typeof value !== "object") {
    return value;
  }

  Object.freeze(value);

  for (const entry of Object.values(value as Record<string, unknown>)) {
    deepFreeze(entry);
  }

  return value;
}

describe("validateProviderDerivedEnrichmentProposalExportV1", () => {
  it("accepts a complete valid document", () => {
    const document = buildValidExportDocument();
    const result = validateProviderDerivedEnrichmentProposalExportV1(document);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.value).toBe(document);
      expect(result.errors).toEqual([]);
    }
  });

  it.each([
    ["null", null],
    ["array", []],
    ["string", "document"],
    ["number", 1],
    ["function", () => undefined],
  ])("rejects root %s", (_label, value) => {
    const result = validateProviderDerivedEnrichmentProposalExportV1(value);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("invalid_schema");
      expect(result.errors).toContain("unsupported_version");
      expect(result.errors).toContain("invalid_enrichment");
    }
  });

  it("rejects missing schema", () => {
    const document = buildValidExportDocument();
    const { schema: _schema, ...withoutSchema } = document;

    const result = validateProviderDerivedEnrichmentProposalExportV1(withoutSchema);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("invalid_schema");
    }
  });

  it("rejects incorrect schema", () => {
    const result = validateProviderDerivedEnrichmentProposalExportV1(
      buildValidExportDocument({ schema: "other.schema" as never }),
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("invalid_schema");
    }
  });

  it("rejects schema with different casing", () => {
    const result = validateProviderDerivedEnrichmentProposalExportV1(
      buildValidExportDocument({
        schema: "devflow.provider-derived-enrichment-PROPOSAL" as never,
      }),
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("invalid_schema");
    }
  });

  it("rejects missing version", () => {
    const document = buildValidExportDocument();
    const { version: _version, ...withoutVersion } = document;

    const result = validateProviderDerivedEnrichmentProposalExportV1(withoutVersion);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("unsupported_version");
    }
  });

  it("rejects string version", () => {
    const result = validateProviderDerivedEnrichmentProposalExportV1(
      buildValidExportDocument({ version: "1" as never }),
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("unsupported_version");
    }
  });

  it("rejects version other than 1", () => {
    const result = validateProviderDerivedEnrichmentProposalExportV1(
      buildValidExportDocument({ version: 2 as never }),
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("unsupported_version");
    }
  });

  it("rejects unexpected root fields", () => {
    const result = validateProviderDerivedEnrichmentProposalExportV1({
      ...buildValidExportDocument(),
      extraField: true,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("unexpected_root_field:extraField");
    }
  });

  it("rejects missing exportedAt", () => {
    const document = buildValidExportDocument();
    const { exportedAt: _exportedAt, ...withoutExportedAt } = document;

    const result = validateProviderDerivedEnrichmentProposalExportV1(withoutExportedAt);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("invalid_exported_at");
    }
  });

  it("rejects invalid exportedAt", () => {
    const result = validateProviderDerivedEnrichmentProposalExportV1(
      buildValidExportDocument({ exportedAt: "not-a-date" }),
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("invalid_exported_at");
    }
  });

  it("rejects exportedAt with non-canonical offset", () => {
    const result = validateProviderDerivedEnrichmentProposalExportV1(
      buildValidExportDocument({ exportedAt: "2026-06-15T18:30:00.000+02:00" }),
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("invalid_exported_at");
    }
  });

  it("rejects impossible exportedAt", () => {
    const result = validateProviderDerivedEnrichmentProposalExportV1(
      buildValidExportDocument({ exportedAt: "2026-13-40T99:99:99.999Z" }),
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("invalid_exported_at");
    }
  });

  it("rejects missing generatedAt", () => {
    const document = buildValidExportDocument();
    const { generatedAt: _generatedAt, ...withoutGeneratedAt } = document;

    const result = validateProviderDerivedEnrichmentProposalExportV1(withoutGeneratedAt);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("invalid_generated_at");
    }
  });

  it("rejects invalid generatedAt", () => {
    const result = validateProviderDerivedEnrichmentProposalExportV1(
      buildValidExportDocument({ generatedAt: "" }),
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("invalid_generated_at");
    }
  });

  it.each([
    ["zero", 0],
    ["negative", -1],
    ["decimal", 1.5],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["string", "2"],
  ])("rejects sourceSignalCount %s", (_label, sourceSignalCount) => {
    const result = validateProviderDerivedEnrichmentProposalExportV1(
      buildValidExportDocument({ sourceSignalCount: sourceSignalCount as never }),
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("invalid_source_signal_count");
    }
  });

  it("rejects reviewRequired false", () => {
    const result = validateProviderDerivedEnrichmentProposalExportV1(
      buildValidExportDocument({ reviewRequired: false as never }),
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("review_required_must_be_true");
    }
  });

  it("rejects missing reviewRequired", () => {
    const document = buildValidExportDocument();
    const { reviewRequired: _reviewRequired, ...withoutReviewRequired } = document;

    const result = validateProviderDerivedEnrichmentProposalExportV1(withoutReviewRequired);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("review_required_must_be_true");
    }
  });

  it("rejects persistedByApplyFlow true", () => {
    const result = validateProviderDerivedEnrichmentProposalExportV1(
      buildValidExportDocument({ persistedByApplyFlow: true as never }),
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("persisted_by_applyflow_must_be_false");
    }
  });

  it("rejects appliedToCareerBundle true", () => {
    const result = validateProviderDerivedEnrichmentProposalExportV1(
      buildValidExportDocument({ appliedToCareerBundle: true as never }),
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("applied_to_career_bundle_must_be_false");
    }
  });

  it("rejects appliedToApplications true", () => {
    const result = validateProviderDerivedEnrichmentProposalExportV1(
      buildValidExportDocument({ appliedToApplications: true as never }),
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("applied_to_applications_must_be_false");
    }
  });

  it("rejects missing enrichment", () => {
    const document = buildValidExportDocument();
    const { enrichment: _enrichment, ...withoutEnrichment } = document;

    const result = validateProviderDerivedEnrichmentProposalExportV1(withoutEnrichment);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("invalid_enrichment");
    }
  });

  it("rejects null enrichment", () => {
    const result = validateProviderDerivedEnrichmentProposalExportV1(
      buildValidExportDocument({ enrichment: null as never }),
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("invalid_enrichment");
    }
  });

  it("rejects invalid enrichment", () => {
    const enrichment = buildSafeSyncEnrichment();
    const result = validateProviderDerivedEnrichmentProposalExportV1(
      buildValidExportDocument({
        enrichment: {
          ...enrichment,
          source: "invalid" as never,
        },
      }),
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("invalid_enrichment");
      expect(result.errors.some((error) => error.startsWith("enrichment:"))).toBe(true);
    }
  });

  it("rejects providerId in enrichment", () => {
    const enrichment = buildSafeSyncEnrichment();
    enrichment.combinedSignals = enrichment.combinedSignals.map((signal) => ({
      ...signal,
      providerId: "provider-message-001",
    }));

    const result = validateProviderDerivedEnrichmentProposalExportV1(
      buildValidExportDocument({ enrichment }),
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("invalid_enrichment");
      expect(result.errors.some((error) => error.includes("provider identifiers"))).toBe(true);
    }
  });

  it("rejects forbidden key on extra root field", () => {
    const result = validateProviderDerivedEnrichmentProposalExportV1({
      ...buildValidExportDocument(),
      access_token: "secret",
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("unexpected_root_field:access_token");
      expect(result.errors).toContain("forbidden_key:access_token");
    }
  });

  it("rejects nested forbidden key", () => {
    const enrichment = buildSafeSyncEnrichment();
    const result = validateProviderDerivedEnrichmentProposalExportV1(
      buildValidExportDocument({
        enrichment: {
          ...enrichment,
          stats: {
            ...enrichment.stats,
            stageCounts: {
              ...enrichment.stats.stageCounts,
              access_token: 1,
            } as never,
          },
        },
      }),
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("forbidden_key:access_token");
    }
  });

  it("rejects deeply nested forbidden key", () => {
    const enrichment = buildSafeSyncEnrichment();
    const result = validateProviderDerivedEnrichmentProposalExportV1(
      buildValidExportDocument({
        enrichment: {
          ...enrichment,
          combinedSignals: enrichment.combinedSignals.map((signal, index) =>
            index === 0
              ? {
                  ...signal,
                  nested: {
                    deep: {
                      rawPayload: "x",
                    },
                  },
                }
              : signal,
          ) as never,
        },
      }),
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("forbidden_key:rawPayload");
    }
  });

  it("allows legitimate values containing forbidden substrings in allowed keys", () => {
    const enrichment = buildSafeSyncEnrichment();
    const result = validateProviderDerivedEnrichmentProposalExportV1(
      buildValidExportDocument({
        enrichment: {
          ...enrichment,
          stats: {
            ...enrichment.stats,
            companyHints: ["Location Labs"],
          },
        },
      }),
    );

    expect(result.valid).toBe(true);
  });

  it("does not mutate input", () => {
    const document = buildValidExportDocument();
    const frozen = deepFreeze(structuredClone(document));

    validateProviderDerivedEnrichmentProposalExportV1(frozen);

    expect(frozen).toEqual(document);
  });

  it("returns the same errors for the same invalid input", () => {
    const invalid = {
      ...buildValidExportDocument(),
      version: 2,
      exportedAt: "bad",
      reviewRequired: false,
    };

    const first = validateProviderDerivedEnrichmentProposalExportV1(invalid);
    const second = validateProviderDerivedEnrichmentProposalExportV1(invalid);

    expect(first).toEqual(second);
  });

  it("returns errors in deterministic order", () => {
    const result = validateProviderDerivedEnrichmentProposalExportV1({
      schema: "wrong",
      version: 2,
      exportedAt: "bad",
      generatedAt: "bad",
      sourceSignalCount: 0,
      reviewRequired: false,
      persistedByApplyFlow: true,
      appliedToCareerBundle: true,
      appliedToApplications: true,
      enrichment: null,
      extraField: true,
      access_token: "secret",
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toEqual([
        "invalid_schema",
        "unsupported_version",
        "unexpected_root_field:access_token",
        "unexpected_root_field:extraField",
        "invalid_exported_at",
        "invalid_generated_at",
        "invalid_source_signal_count",
        "review_required_must_be_true",
        "persisted_by_applyflow_must_be_false",
        "applied_to_career_bundle_must_be_false",
        "applied_to_applications_must_be_false",
        "forbidden_key:access_token",
        "invalid_enrichment",
      ]);
    }
  });

  it("does not expose additional payload on valid result", () => {
    const document = buildValidExportDocument();
    const result = validateProviderDerivedEnrichmentProposalExportV1(document);

    expect(result).toEqual({
      valid: true,
      value: document,
      warnings: expect.any(Array),
      errors: [],
    });
    expect(Object.keys(result)).toEqual(["valid", "value", "warnings", "errors"]);
  });

  it("preserves canonical enrichment warnings safely", () => {
    const enrichment = buildSafeSyncEnrichment();
    enrichment.privacy = {
      ...enrichment.privacy,
      redacted: false,
    };

    const result = validateProviderDerivedEnrichmentProposalExportV1(
      buildValidExportDocument({ enrichment }),
    );

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.warnings).toContain("privacy.redacted must be true.");
    }
  });

  it("prefixes enrichment errors stably", () => {
    const result = validateProviderDerivedEnrichmentProposalExportV1(
      buildValidExportDocument({
        enrichment: {
          source: "sync",
          combinedSignals: [],
          summary: 123,
          stats: {},
          generatedAt: "bad",
          privacy: {},
        } as never,
      }),
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0]).toBe("invalid_enrichment");
      expect(result.errors.filter((error) => error.startsWith("enrichment:")).length).toBeGreaterThan(0);
    }
  });
});

describe("validateProviderDerivedEnrichmentProposalExport", () => {
  it("delegates valid version 1 documents to V1 validator", () => {
    const document = buildValidExportDocument();
    const generic = validateProviderDerivedEnrichmentProposalExport(document);
    const specific = validateProviderDerivedEnrichmentProposalExportV1(document);

    expect(generic).toEqual(specific);
  });

  it("returns invalid_schema for wrong schema", () => {
    const result = validateProviderDerivedEnrichmentProposalExport(
      buildValidExportDocument({ schema: "wrong" as never }),
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toEqual(["invalid_schema"]);
    }
  });

  it("returns unsupported_version when version is missing", () => {
    const document = buildValidExportDocument();
    const { version: _version, ...withoutVersion } = document;

    const result = validateProviderDerivedEnrichmentProposalExport(withoutVersion);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toEqual(["unsupported_version"]);
    }
  });

  it("returns unsupported_version for version 2", () => {
    const result = validateProviderDerivedEnrichmentProposalExport(
      buildValidExportDocument({ version: 2 as never }),
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toEqual(["unsupported_version"]);
    }
  });

  it("does not validate unknown versions as V1", () => {
    const result = validateProviderDerivedEnrichmentProposalExport(
      buildValidExportDocument({ version: 99 as never }),
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toEqual(["unsupported_version"]);
      expect(result.errors).not.toContain("invalid_exported_at");
    }
  });
});
