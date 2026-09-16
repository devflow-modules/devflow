import { describe, expect, it } from "vitest";

import { resolvedRejection } from "../application-outcome.js";
import type { ApplyFlowApplicationV2Envelope } from "../application-record-v2.js";
import {
  computeCaseUsage,
  computeEffortMetrics,
  computeEvidenceUsage,
  computeFitBandPerformance,
  computeFunnelMetrics,
  computeGapFrequency,
  computeGapOutcomeAssociation,
  computeNetworkingPerformance,
  computePriorityPerformance,
  computeResumePerformance,
} from "../career-analytics.js";
import type { ApplicationOutcome, CareerAnalyticsInput, HistoricalDecisionRecord } from "../career-analytics-types.js";
import { OBSERVED_ASSOCIATION_DISCLAIMER } from "../career-analytics-types.js";
import { generateCareerInsights, insightUsesCausalLanguage } from "../career-insights.js";
import { computeWeeklyOperatingMetrics } from "../career-scorecard.js";
import { createApplyFlowCareerBundleV2, parseApplyFlowCareerBundle, serializeApplyFlowCareerBundleV2 } from "../career-bundle-v2.js";
import { parseApplyFlowApplicationsImport } from "../imported-application-schema.js";
import { gustavoProfile } from "../candidate-profile.js";

const NOW = new Date("2026-09-09T12:00:00.000Z");

function app(
  id: string,
  status: ApplyFlowApplicationV2Envelope["status"],
  extras: Partial<ApplyFlowApplicationV2Envelope> = {},
): ApplyFlowApplicationV2Envelope {
  return {
    id,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-02T00:00:00.000Z",
    source: "linkedin",
    status,
    jobTitle: extras.jobTitle ?? "Product Engineer",
    ...extras,
  };
}

function outcome(applicationId: string, patch: Partial<ApplicationOutcome> = {}): ApplicationOutcome {
  return {
    applicationId,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-02T00:00:00.000Z",
    ...patch,
  };
}

describe("P2 career analytics", () => {
  it("1. Funnel rates are exact for 10 applied / 4 screening / 2 technical / 1 offer", () => {
    const applications = Array.from({ length: 10 }, (_, i) => app(`a${i}`, "applied"));
    const outcomes = applications.map((item, i) =>
      outcome(item.id, {
        screeningAt: i < 4 ? "2026-09-03T00:00:00.000Z" : undefined,
        technicalAt: i < 2 ? "2026-09-04T00:00:00.000Z" : undefined,
        offerAt: i === 0 ? "2026-09-05T00:00:00.000Z" : undefined,
      }),
    );
    const funnel = computeFunnelMetrics({ applications, outcomes, now: NOW });
    expect(funnel.counts.APPLIED).toBe(10);
    expect(funnel.counts.SCREENING).toBe(4);
    expect(funnel.counts.TECHNICAL).toBe(2);
    expect(funnel.counts.OFFER).toBe(1);
    expect(funnel.conversionRates.appliedToScreening).toBe(0.4);
    expect(funnel.conversionRates.screeningToTechnical).toBe(0.5);
    expect(funnel.conversionRates.appliedToOffer).toBe(0.1);
    expect(funnel.conversionRates.technicalToFinal).toBe(0);
    expect(Object.values(funnel.conversionRates).every((value) => Number.isFinite(value))).toBe(true);
  });

  it("2. Fit band 80–89 outperforms 60–69 in this dataset without causal language", () => {
    const applications = [
      ...Array.from({ length: 6 }, (_, i) => app(`hi${i}`, "applied", { fitScore: 85 })),
      ...Array.from({ length: 6 }, (_, i) => app(`mid${i}`, "applied", { fitScore: 65 })),
    ];
    const outcomes = applications.map((item) =>
      outcome(item.id, {
        fitAtApplication: item.fitScore,
        screeningAt: item.id.startsWith("hi") && item.id !== "hi5" ? "2026-09-03T00:00:00.000Z" : undefined,
      }),
    );
    const bands = computeFitBandPerformance({ applications, outcomes, now: NOW });
    const high = bands.find((item) => item.band === "80-89");
    const mid = bands.find((item) => item.band === "60-69");
    expect(high?.screeningRate ?? 0).toBeGreaterThan(mid?.screeningRate ?? 1);
    const insights = generateCareerInsights({ applications, outcomes, now: NOW });
    expect(insights.some((item) => item.id === "insight-fit-band")).toBe(true);
    expect(insights.every((item) => !insightUsesCausalLanguage(`${item.title} ${item.description}`))).toBe(true);
  });

  it("3. Resume B can have a higher rate with low confidence when n=2", () => {
    const applications = [
      ...Array.from({ length: 12 }, (_, i) => app(`A${i}`, "applied")),
      app("B0", "applied"),
      app("B1", "applied"),
    ];
    const outcomes = applications.map((item) =>
      outcome(item.id, {
        resumeVariant: item.id.startsWith("A") ? "ATS Full Stack" : "Personalized ATS",
        screeningAt: item.id.startsWith("B") || item.id === "A0" ? "2026-09-03T00:00:00.000Z" : undefined,
      }),
    );
    const rows = computeResumePerformance({ applications, outcomes, now: NOW });
    const a = rows.find((item) => item.resumeVariant === "ATS Full Stack");
    const b = rows.find((item) => item.resumeVariant === "Personalized ATS");
    expect(a?.sampleSize).toBe(12);
    expect(b?.sampleSize).toBe(2);
    expect(b?.screeningRate ?? 0).toBeGreaterThan(a?.screeningRate ?? 1);
    expect(b?.confidence).toBe("low");
  });

  it("4. Networking comparison includes the association disclaimer", () => {
    const applications = [app("n1", "applied"), app("n2", "applied")];
    const outcomes = [
      outcome("n1", { networkingUsed: true, firstResponseAt: "2026-09-03T00:00:00.000Z" }),
      outcome("n2", { networkingUsed: false }),
    ];
    const rows = computeNetworkingPerformance({ applications, outcomes, now: NOW });
    expect(rows.every((item) => item.disclaimer === OBSERVED_ASSOCIATION_DISCLAIMER)).toBe(true);
    expect(rows.find((item) => item.cohort === "with_networking")?.responseRate).toBe(1);
  });

  it("5. AWS GAP frequency is 40% across 10 high-priority jobs", () => {
    const decisions: HistoricalDecisionRecord[] = Array.from({ length: 10 }, (_, i) => ({
      jobId: `j${i}`,
      highPriority: true,
      qualified: true,
      applied: true,
      reachedScreening: i < 3,
      matches: [
        {
          requirementKey: i < 4 ? "Amazon Web Services" : "React",
          label: i < 4 ? "3+ years architecting AWS" : "React",
          category: i < 4 ? "cloud" : "frontend",
          status: i < 4 ? "gap" : "proven",
        },
      ],
    }));
    const freq = computeGapFrequency({ applications: [], decisions, now: NOW });
    const aws = freq.find((item) => item.requirementKey === "aws");
    expect(aws?.gapCount).toBe(4);
    expect(aws?.highPriorityFrequency).toBe(0.4);
  });

  it("6. Gap association can be worse with low sample and low confidence", () => {
    const applications = [app("g1", "applied"), app("g2", "applied"), app("g3", "interview"), app("g4", "interview")];
    const outcomes = applications.map((item) => outcome(item.id));
    const decisions: HistoricalDecisionRecord[] = [
      { applicationId: "g1", highPriority: true, qualified: true, applied: true, reachedScreening: false, matches: [{ requirementKey: "aws", label: "AWS", category: "cloud", status: "gap" }] },
      { applicationId: "g2", highPriority: true, qualified: true, applied: true, reachedScreening: false, matches: [{ requirementKey: "aws", label: "AWS", category: "cloud", status: "gap" }] },
      { applicationId: "g3", highPriority: true, qualified: true, applied: true, reachedScreening: true, matches: [{ requirementKey: "aws", label: "AWS", category: "cloud", status: "proven" }] },
      { applicationId: "g4", highPriority: true, qualified: true, applied: true, reachedScreening: true, matches: [{ requirementKey: "aws", label: "AWS", category: "cloud", status: "proven" }] },
    ];
    const assoc = computeGapOutcomeAssociation({ applications, outcomes, decisions, now: NOW });
    const aws = assoc.find((item) => item.requirementKey === "aws");
    expect(aws?.screeningRateWithGap).toBeLessThan(aws?.screeningRateWithoutGap ?? 1);
    expect(aws?.confidence).toBe("low");
    expect(aws?.disclaimer).toBe(OBSERVED_ASSOCIATION_DISCLAIMER);
  });

  it("7. UNKNOWN never counts as GAP", () => {
    const decisions: HistoricalDecisionRecord[] = [
      {
        jobId: "u1",
        highPriority: true,
        qualified: true,
        applied: false,
        reachedScreening: false,
        matches: [{ requirementKey: "Elixir", label: "Elixir", category: "backend", status: "unknown" }],
      },
    ];
    const freq = computeGapFrequency({ applications: [], decisions, now: NOW });
    const elixir = freq.find((item) => item.requirementKey === "elixir");
    expect(elixir?.unknownCount).toBe(1);
    expect(elixir?.gapCount).toBe(0);
    expect(elixir?.frequency).toBe(0);
  });

  it("8. Rejection without an explicit reason stays unknown", () => {
    const result = resolvedRejection(outcome("r1", { rejectedAt: "2026-09-04T00:00:00.000Z", finalStatus: "rejected" }));
    expect(result.category).toBe("unknown");
    expect(result.source).toBe("unknown");
  });

  it("9. Evidence usage aggregates supportingEvidenceIds", () => {
    const applications = [app("e1", "interview"), app("e2", "applied")];
    const usage = computeEvidenceUsage({
      applications,
      outcomes: [outcome("e1"), outcome("e2")],
      evidenceUsage: [
        { applicationId: "e1", evidenceIds: ["seed-whatsapp-platform", "seed-investigamais"], labels: { "seed-whatsapp-platform": "WhatsApp Platform" } },
        { applicationId: "e2", evidenceIds: ["seed-whatsapp-platform"] },
      ],
      now: NOW,
    });
    const whatsapp = usage.find((item) => item.evidenceId === "seed-whatsapp-platform");
    expect(whatsapp?.applications).toBe(2);
    expect(whatsapp?.screenings).toBe(1);
    expect(whatsapp?.label).toBe("WhatsApp Platform");
  });

  it("10. Priority cohorts compare apply_high / apply_normal / apply_stretch", () => {
    const applications = [app("p1", "applied"), app("p2", "applied"), app("p3", "applied")];
    const outcomes = [
      outcome("p1", { decisionAtApplication: "apply_high", screeningAt: "2026-09-03T00:00:00.000Z" }),
      outcome("p2", { decisionAtApplication: "apply_normal" }),
      outcome("p3", { decisionAtApplication: "apply_stretch" }),
    ];
    const rows = computePriorityPerformance({ applications, outcomes, now: NOW });
    expect(rows.filter((item) => item.kind === "decision").map((item) => item.key)).toEqual([
      "apply_high",
      "apply_normal",
      "apply_stretch",
    ]);
    expect(rows.find((item) => item.key === "apply_high")?.screenings).toBe(1);
  });

  it("11. Zero data stays finite and emits insufficient_data", () => {
    const input: CareerAnalyticsInput = { applications: [], now: NOW };
    const funnel = computeFunnelMetrics(input);
    expect(Object.values(funnel.conversionRates).every((value) => Number.isFinite(value) && value === 0)).toBe(true);
    const insights = generateCareerInsights(input);
    expect(insights[0]?.type).toBe("insufficient_data");
    expect(computeEffortMetrics(input).status).toBe("insufficient_data");
  });

  it("12. Bundle V1 remains valid and V2 round-trips raw analytics", () => {
    const v1 = parseApplyFlowApplicationsImport([
      { id: "app-1", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z", status: "reviewing", source: "linkedin" },
    ]);
    expect(v1.ok).toBe(true);
    const migrated = parseApplyFlowCareerBundle({ version: 1, applications: v1.ok ? v1.applications : [] });
    expect(migrated.ok).toBe(true);
    const original = createApplyFlowCareerBundleV2({
      profile: gustavoProfile,
      applications: v1.ok ? v1.applications : [],
      outcomes: [outcome("app-1", { source: "linkedin" })],
      events: [{ id: "evt-1", applicationId: "app-1", type: "note", occurredAt: "2026-01-02T00:00:00.000Z" }],
      efforts: [{ applicationId: "app-1", personalizationMinutes: 20 }],
      extras: { keep: true },
    });
    const again = parseApplyFlowCareerBundle(serializeApplyFlowCareerBundleV2(original));
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.bundle.outcomes[0]?.applicationId).toBe("app-1");
    expect(again.bundle.events).toHaveLength(1);
    expect(again.bundle.efforts[0]?.personalizationMinutes).toBe(20);
    expect(again.bundle.extras?.keep).toBe(true);
  });

  it("13. Partial effort data does not invent time", () => {
    const metrics = computeEffortMetrics({
      applications: [app("x", "applied")],
      efforts: [{ applicationId: "x" }],
      now: NOW,
    });
    expect(metrics.totalMinutes).toBeUndefined();
    expect(metrics.applicationsPerHour).toBeUndefined();
    expect(metrics.status).toBe("insufficient_data");
  });

  it("14. CareerInsights never use causal verbs", () => {
    const applications = Array.from({ length: 8 }, (_, i) => app(`c${i}`, "applied", { fitScore: i < 4 ? 82 : 62 }));
    const outcomes = applications.map((item) =>
      outcome(item.id, { fitAtApplication: item.fitScore, networkingUsed: item.id === "c0", decisionAtApplication: "apply_normal" }),
    );
    const insights = generateCareerInsights({ applications, outcomes, now: NOW });
    const blob = insights.map((item) => `${item.title} ${item.description}`).join("\n");
    expect(insightUsesCausalLanguage(blob)).toBe(false);
    expect(blob).not.toMatch(/\bcaused\b|\bproves\b|\bguarantees\b|\bdoubles your chances\b/i);
  });

  it("case usage stays observational", () => {
    const rows = computeCaseUsage({
      applications: [app("c1", "technical_test")],
      caseUsage: [{ applicationId: "c1", cases: ["WhatsApp Platform"], interviewPrepared: true }],
      now: NOW,
    });
    expect(rows[0]?.timesRecommended).toBe(1);
    expect(rows[0]?.technicalStages).toBe(1);
  });

  it("weekly operating metrics compare one previous window without recursing", () => {
    const applications = [
      app("now", "applied", { createdAt: "2026-09-08T00:00:00.000Z" }),
      app("prev", "applied", { createdAt: "2026-08-28T00:00:00.000Z" }),
    ];
    const weekly = computeWeeklyOperatingMetrics({ applications, now: NOW }, "7d");
    expect(weekly.applications).toBe(1);
    expect(weekly.previous?.applications).toBe(1);
    expect(weekly.previous).not.toHaveProperty("previous");
  });
});
