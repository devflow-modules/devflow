import type { ApplicationDecision } from "./application-decision-types.js";
import type { ApplyFlowApplicationV2Envelope } from "./application-record-v2.js";
import { applySnapshotToOutcome, outcomeFromApplication, resolvedRejection } from "./application-outcome.js";
import {
  comparisonConfidence,
  confidenceFromSampleSize,
  fitBandFor,
  median,
  priorityBandFor,
  safeRate,
} from "./analytics-confidence.js";
import { categoryFromKey, normalizeCareerSource, normalizeRequirementKey, normalizeRoleFamily } from "./career-analytics-normalize.js";
import type {
  ApplicationOutcome,
  CareerAnalyticsInput,
  CareerSource,
  CaseUsageRecord,
  EvidenceUsageRecord,
  FitBand,
  HistoricalDecisionRecord,
  PriorityBand,
  RateBlock,
} from "./career-analytics-types.js";
import { FIT_BANDS, OBSERVED_ASSOCIATION_DISCLAIMER, PRIORITY_BANDS } from "./career-analytics-types.js";
import type { Confidence } from "./types.js";

export type FunnelStage =
  | "FOUND"
  | "QUALIFIED"
  | "APPLIED"
  | "RECRUITER_CONTACTED"
  | "SCREENING"
  | "TECHNICAL"
  | "FINAL"
  | "OFFER"
  | "REJECTED";

export type FunnelMetrics = {
  counts: Record<FunnelStage, number>;
  conversionRates: {
    foundToQualified: number;
    qualifiedToApplied: number;
    appliedToResponse: number;
    appliedToScreening: number;
    screeningToTechnical: number;
    technicalToFinal: number;
    finalToOffer: number;
    appliedToOffer: number;
  };
  timing: {
    medianTimeToFirstResponse?: number;
    medianTimeBetweenStages?: number;
    medianApplicationAge?: number;
  };
  sampleSize: number;
};

export type FitBandPerformance = RateBlock & { band: FitBand };
export type RolePerformance = RateBlock & { roleType: string; seniority?: string; specialization?: string };
export type SourcePerformance = RateBlock & { source: CareerSource };
export type ResumePerformance = RateBlock & { resumeVariant: string; resumeStrategy?: string };
export type NetworkingCohort = RateBlock & {
  cohort: "with_networking" | "without_networking" | "recruiter" | "engineering_leadership" | "referral" | "internal_contact";
  medianResponseTime?: number;
  disclaimer: typeof OBSERVED_ASSOCIATION_DISCLAIMER;
};
export type GapFrequency = {
  requirementKey: string;
  label: string;
  category: string;
  gapCount: number;
  partialCount: number;
  unknownCount: number;
  jobsCount: number;
  frequency: number;
  highPriorityFrequency: number;
};
export type GapOutcomeAssociation = {
  requirementKey: string;
  label: string;
  applicationsWithGap: number;
  screeningsWithGap: number;
  screeningRateWithGap: number;
  applicationsWithoutGap: number;
  screeningRateWithoutGap: number;
  difference: number;
  sampleSize: number;
  confidence: Confidence;
  disclaimer: typeof OBSERVED_ASSOCIATION_DISCLAIMER;
};
export type EvidenceUsage = RateBlock & { evidenceId: string; label: string };
export type CaseUsage = {
  case: string;
  timesRecommended: number;
  interviewsPrepared: number;
  technicalStages: number;
  finalStages: number;
  offers: number;
  sampleSize: number;
  confidence: Confidence;
};
export type PriorityPerformance = RateBlock & { key: ApplicationDecision | PriorityBand; kind: "decision" | "priority" };
export type EffortMetrics = {
  totalMinutes?: number;
  applicationsPerHour?: number;
  screeningsPerHour?: number;
  offersPerHour?: number;
  knownDataCoverage: number;
  status: "ready" | "insufficient_data";
};

type ResolvedRow = {
  application: ApplyFlowApplicationV2Envelope;
  outcome: ApplicationOutcome;
  applied: boolean;
  response: boolean;
  screening: boolean;
  technical: boolean;
  final: boolean;
  offer: boolean;
  rejected: boolean;
};

function outcomeMap(input: CareerAnalyticsInput): Map<string, ApplicationOutcome> {
  const map = new Map<string, ApplicationOutcome>();
  for (const item of input.outcomes ?? []) map.set(item.applicationId, item);
  return map;
}

export function historicalDecisionsFromSnapshots(input: CareerAnalyticsInput): HistoricalDecisionRecord[] {
  const outcomes = outcomeMap(input);
  return input.applications.flatMap((application) => {
    const outcome = outcomes.get(application.id);
    const snapshot = outcome?.snapshot;
    if (!snapshot) return [];
    const status = application.status;
    const applied =
      status === "applied" ||
      status === "waiting_response" ||
      status === "interview" ||
      status === "technical_test" ||
      status === "rejected" ||
      status === "accepted" ||
      Boolean(outcome?.screeningAt || outcome?.technicalAt || outcome?.offerAt || outcome?.rejectedAt || outcome?.firstResponseAt);
    return [
      {
        jobId: application.v2?.sourceJobId,
        applicationId: application.id,
        highPriority: snapshot.priority >= 70 || snapshot.decision === "apply_high",
        qualified: snapshot.decision === "apply_high" || snapshot.decision === "apply_normal" || snapshot.decision === "apply_stretch",
        applied,
        reachedScreening: status === "interview" || Boolean(outcome?.screeningAt),
        matches: snapshot.requirements.map((item) => ({
          requirementKey: normalizeRequirementKey(item.label),
          label: item.label,
          category: item.category,
          status: item.status,
        })),
      },
    ];
  });
}

function resolvedEvidenceUsage(input: CareerAnalyticsInput): EvidenceUsageRecord[] {
  if (input.evidenceUsage && input.evidenceUsage.length > 0) return [...input.evidenceUsage];
  return (input.outcomes ?? []).flatMap((item) => {
    const ids = item.snapshot?.supportingEvidenceIds ?? [];
    if (!ids.length) return [];
    return [{ applicationId: item.applicationId, evidenceIds: ids }];
  });
}

function resolvedCaseUsage(input: CareerAnalyticsInput): CaseUsageRecord[] {
  if (input.caseUsage && input.caseUsage.length > 0) return [...input.caseUsage];
  return (input.outcomes ?? []).flatMap((item) => {
    const ids = item.snapshot?.primaryCaseIds ?? [];
    if (!ids.length) return [];
    return [{ applicationId: item.applicationId, cases: ids }];
  });
}

function resolveRows(input: CareerAnalyticsInput): ResolvedRow[] {
  const outcomes = outcomeMap(input);
  return input.applications.map((application) => {
    const outcome = applySnapshotToOutcome(
      outcomes.get(application.id) ??
        outcomeFromApplication(application, {
          contacts: input.contacts,
          interactions: input.interactions,
        }),
    );
    const status = application.status;
    const applied =
      status === "applied" ||
      status === "waiting_response" ||
      status === "interview" ||
      status === "technical_test" ||
      status === "rejected" ||
      status === "accepted" ||
      Boolean(outcome.screeningAt || outcome.technicalAt || outcome.offerAt || outcome.rejectedAt || outcome.firstResponseAt);
    const screening = Boolean(outcome.screeningAt) || status === "interview" || status === "technical_test" || status === "accepted";
    const technical = Boolean(outcome.technicalAt) || status === "technical_test";
    const final = Boolean(outcome.finalInterviewAt);
    const offer = Boolean(outcome.offerAt) || status === "accepted";
    const response = Boolean(outcome.firstResponseAt) || status === "waiting_response" || screening || technical || final || offer;
    const rejected = Boolean(outcome.rejectedAt) || status === "rejected";
    return { application, outcome, applied, response, screening, technical, final, offer, rejected };
  });
}

function rateBlock(rows: readonly ResolvedRow[]): RateBlock {
  const applications = rows.length;
  const responses = rows.filter((item) => item.response).length;
  const screenings = rows.filter((item) => item.screening).length;
  const technicals = rows.filter((item) => item.technical).length;
  const finals = rows.filter((item) => item.final).length;
  const offers = rows.filter((item) => item.offer).length;
  return {
    applications,
    responses,
    screenings,
    technicals,
    finals,
    offers,
    responseRate: safeRate(responses, applications),
    screeningRate: safeRate(screenings, applications),
    technicalRate: safeRate(technicals, applications),
    offerRate: safeRate(offers, applications),
    sampleSize: applications,
    confidence: confidenceFromSampleSize(applications),
  };
}

export function computeFunnelMetrics(input: CareerAnalyticsInput): FunnelMetrics {
  const rows = resolveRows(input);
  const jobs = input.jobs ?? [];
  const found = jobs.length > 0 ? jobs.length : input.applications.length;
  const qualified =
    jobs.length > 0
      ? jobs.filter(
          (job) =>
            job.status !== "ignored" &&
            job.jobMatch.decision !== "skip" &&
            job.jobMatch.decision !== "needs_info",
        ).length
      : input.applications.filter((item) => item.status !== "ignored").length;
  const applied = rows.filter((item) => item.applied).length;
  const recruiter = rows.filter((item) => item.response).length;
  const screening = rows.filter((item) => item.screening).length;
  const technical = rows.filter((item) => item.technical).length;
  const final = rows.filter((item) => item.final).length;
  const offer = rows.filter((item) => item.offer).length;
  const rejected = rows.filter((item) => item.rejected).length;
  const now = (input.now ?? new Date()).getTime();
  const ages = rows.map((item) => now - Date.parse(item.application.createdAt)).filter((item) => Number.isFinite(item));
  const responseTimes = rows
    .map((item) => {
      if (!item.outcome.firstResponseAt) return undefined;
      return Date.parse(item.outcome.firstResponseAt) - Date.parse(item.application.createdAt);
    })
    .filter((item): item is number => typeof item === "number" && Number.isFinite(item) && item >= 0);
  const between = rows
    .map((item) => {
      if (item.outcome.screeningAt && item.outcome.firstResponseAt) {
        return Date.parse(item.outcome.screeningAt) - Date.parse(item.outcome.firstResponseAt);
      }
      return undefined;
    })
    .filter((item): item is number => typeof item === "number" && Number.isFinite(item) && item >= 0);

  return {
    counts: {
      FOUND: found,
      QUALIFIED: qualified,
      APPLIED: applied,
      RECRUITER_CONTACTED: recruiter,
      SCREENING: screening,
      TECHNICAL: technical,
      FINAL: final,
      OFFER: offer,
      REJECTED: rejected,
    },
    conversionRates: {
      foundToQualified: safeRate(qualified, found),
      qualifiedToApplied: safeRate(applied, qualified),
      appliedToResponse: safeRate(recruiter, applied),
      appliedToScreening: safeRate(screening, applied),
      screeningToTechnical: safeRate(technical, screening),
      technicalToFinal: safeRate(final, technical),
      finalToOffer: safeRate(offer, final),
      appliedToOffer: safeRate(offer, applied),
    },
    timing: {
      medianTimeToFirstResponse: median(responseTimes),
      medianTimeBetweenStages: median(between),
      medianApplicationAge: median(ages),
    },
    sampleSize: rows.length,
  };
}

export function computeFitBandPerformance(input: CareerAnalyticsInput): FitBandPerformance[] {
  const rows = resolveRows(input);
  return FIT_BANDS.map((band) => {
    const group = rows.filter((item) => fitBandFor(item.outcome.fitAtApplication ?? item.application.fitScore) === band);
    return { band, ...rateBlock(group) };
  });
}

export function computeRolePerformance(input: CareerAnalyticsInput): RolePerformance[] {
  const groups = new Map<string, ResolvedRow[]>();
  for (const row of resolveRows(input)) {
    const roleType = normalizeRoleFamily({
      title: row.application.jobTitle,
      roleType: row.application.jobMeta?.roleType,
    });
    const list = groups.get(roleType) ?? [];
    list.push(row);
    groups.set(roleType, list);
  }
  return [...groups.entries()]
    .map(([roleType, group]) => ({
      roleType,
      seniority: group[0]?.application.jobMeta?.seniority,
      ...rateBlock(group),
    }))
    .sort((a, b) => b.applications - a.applications || a.roleType.localeCompare(b.roleType));
}

export function computeSourcePerformance(input: CareerAnalyticsInput): SourcePerformance[] {
  const groups = new Map<CareerSource, ResolvedRow[]>();
  for (const row of resolveRows(input)) {
    const source = row.outcome.source ?? normalizeCareerSource(row.application.jobUrl ?? row.application.source);
    const list = groups.get(source) ?? [];
    list.push(row);
    groups.set(source, list);
  }
  return [...groups.entries()].map(([source, group]) => ({ source, ...rateBlock(group) }));
}

export function computeResumePerformance(input: CareerAnalyticsInput): ResumePerformance[] {
  const groups = new Map<string, ResolvedRow[]>();
  for (const row of resolveRows(input)) {
    const variant = row.outcome.resumeVariant ?? row.application.resumeTrack ?? "unspecified";
    const list = groups.get(variant) ?? [];
    list.push(row);
    groups.set(variant, list);
  }
  return [...groups.entries()].map(([resumeVariant, group]) => ({
    resumeVariant,
    resumeStrategy: group[0]?.outcome.resumeStrategy,
    ...rateBlock(group),
  }));
}

export function computeNetworkingPerformance(input: CareerAnalyticsInput): NetworkingCohort[] {
  const rows = resolveRows(input);
  const withNet = rows.filter((item) => item.outcome.networkingUsed);
  const without = rows.filter((item) => !item.outcome.networkingUsed);
  const responseTime = (group: ResolvedRow[]) =>
    median(
      group
        .map((item) =>
          item.outcome.firstResponseAt
            ? Date.parse(item.outcome.firstResponseAt) - Date.parse(item.application.createdAt)
            : undefined,
        )
        .filter((item): item is number => typeof item === "number" && Number.isFinite(item)),
    );
  const pack = (cohort: NetworkingCohort["cohort"], group: ResolvedRow[]): NetworkingCohort => ({
    cohort,
    ...rateBlock(group),
    medianResponseTime: responseTime(group),
    disclaimer: OBSERVED_ASSOCIATION_DISCLAIMER,
  });
  return [pack("with_networking", withNet), pack("without_networking", without)];
}

export function computeGapFrequency(input: CareerAnalyticsInput): GapFrequency[] {
  const decisions = input.decisions ?? [];
  const byKey = new Map<string, GapFrequency>();
  const highPriority = decisions.filter((item) => item.highPriority);
  for (const decision of decisions) {
    for (const match of decision.matches) {
      const requirementKey = normalizeRequirementKey(match.label, match.requirementKey);
      const current = byKey.get(requirementKey) ?? {
        requirementKey,
        label: match.label,
        category: match.category,
        gapCount: 0,
        partialCount: 0,
        unknownCount: 0,
        jobsCount: 0,
        frequency: 0,
        highPriorityFrequency: 0,
      };
      current.jobsCount += 1;
      if (match.status === "gap") current.gapCount += 1;
      else if (match.status === "partial") current.partialCount += 1;
      else if (match.status === "unknown") current.unknownCount += 1;
      byKey.set(requirementKey, current);
    }
  }
  return [...byKey.values()].map((item) => {
    const highJobs = highPriority.filter((decision) =>
      decision.matches.some((match) => normalizeRequirementKey(match.label, match.requirementKey) === item.requirementKey),
    ).length;
    const highGaps = highPriority.filter((decision) =>
      decision.matches.some(
        (match) => normalizeRequirementKey(match.label, match.requirementKey) === item.requirementKey && match.status === "gap",
      ),
    ).length;
    return {
      ...item,
      frequency: safeRate(item.gapCount, item.jobsCount),
      highPriorityFrequency: safeRate(highGaps, highPriority.length || highJobs),
    };
  });
}

export function computeGapOutcomeAssociation(input: CareerAnalyticsInput): GapOutcomeAssociation[] {
  const rows = resolveRows(input);
  const byApp = new Map(rows.map((item) => [item.application.id, item]));
  const keys = new Set<string>();
  for (const decision of input.decisions ?? []) {
    for (const match of decision.matches) keys.add(normalizeRequirementKey(match.label, match.requirementKey));
  }
  return [...keys].map((requirementKey) => {
    const withGap: ResolvedRow[] = [];
    const without: ResolvedRow[] = [];
    for (const decision of input.decisions ?? []) {
      const row = decision.applicationId ? byApp.get(decision.applicationId) : undefined;
      if (!row) continue;
      const match = decision.matches.find((item) => normalizeRequirementKey(item.label, item.requirementKey) === requirementKey);
      if (!match) continue;
      if (match.status === "gap") withGap.push(row);
      else if (match.status !== "unknown") without.push(row);
    }
    const screeningRateWithGap = safeRate(withGap.filter((item) => item.screening).length, withGap.length);
    const screeningRateWithoutGap = safeRate(without.filter((item) => item.screening).length, without.length);
    const label =
      input.decisions?.flatMap((item) => item.matches).find((item) => normalizeRequirementKey(item.label, item.requirementKey) === requirementKey)
        ?.label ?? requirementKey;
    return {
      requirementKey,
      label,
      applicationsWithGap: withGap.length,
      screeningsWithGap: withGap.filter((item) => item.screening).length,
      screeningRateWithGap,
      applicationsWithoutGap: without.length,
      screeningRateWithoutGap,
      difference: screeningRateWithGap - screeningRateWithoutGap,
      sampleSize: Math.min(withGap.length, without.length),
      confidence: comparisonConfidence(withGap.length, without.length),
      disclaimer: OBSERVED_ASSOCIATION_DISCLAIMER,
    };
  });
}

export function computeEvidenceUsage(input: CareerAnalyticsInput): EvidenceUsage[] {
  const rows = new Map(resolveRows(input).map((item) => [item.application.id, item]));
  const byId = new Map<string, { label: string; group: ResolvedRow[] }>();
  for (const record of resolvedEvidenceUsage(input)) {
    const row = rows.get(record.applicationId);
    if (!row) continue;
    for (const evidenceId of record.evidenceIds) {
      const current = byId.get(evidenceId) ?? { label: record.labels?.[evidenceId] ?? evidenceId, group: [] };
      current.group.push(row);
      byId.set(evidenceId, current);
    }
  }
  return [...byId.entries()].map(([evidenceId, value]) => ({ evidenceId, label: value.label, ...rateBlock(value.group) }));
}

export function computeCaseUsage(input: CareerAnalyticsInput): CaseUsage[] {
  const rows = new Map(resolveRows(input).map((item) => [item.application.id, item]));
  const byCase = new Map<string, CaseUsage>();
  for (const record of resolvedCaseUsage(input)) {
    const row = rows.get(record.applicationId);
    for (const name of record.cases) {
      const current = byCase.get(name) ?? {
        case: name,
        timesRecommended: 0,
        interviewsPrepared: 0,
        technicalStages: 0,
        finalStages: 0,
        offers: 0,
        sampleSize: 0,
        confidence: "low",
      };
      current.timesRecommended += 1;
      if (record.interviewPrepared) current.interviewsPrepared += 1;
      if (row?.technical) current.technicalStages += 1;
      if (row?.final) current.finalStages += 1;
      if (row?.offer) current.offers += 1;
      current.sampleSize += 1;
      current.confidence = confidenceFromSampleSize(current.sampleSize);
      byCase.set(name, current);
    }
  }
  return [...byCase.values()];
}

export function computePriorityPerformance(input: CareerAnalyticsInput): PriorityPerformance[] {
  const rows = resolveRows(input);
  const decisions: ApplicationDecision[] = ["apply_high", "apply_normal", "apply_stretch"];
  const byDecision = decisions.map((key) => ({
    key,
    kind: "decision" as const,
    ...rateBlock(rows.filter((item) => item.outcome.decisionAtApplication === key)),
  }));
  const byPriority = PRIORITY_BANDS.map((key) => ({
    key,
    kind: "priority" as const,
    ...rateBlock(rows.filter((item) => priorityBandFor(item.outcome.priorityAtApplication) === key)),
  }));
  return [...byDecision, ...byPriority];
}

export function computeEffortMetrics(input: CareerAnalyticsInput): EffortMetrics {
  const efforts = input.efforts ?? [];
  const minutes = efforts.flatMap((item) =>
    [item.personalizationMinutes, item.networkingMinutes, item.interviewPrepMinutes].filter(
      (value): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0,
    ),
  );
  const coverage = safeRate(efforts.filter((item) => minutesFor(item) > 0).length, input.applications.length);
  if (minutes.length === 0) {
    return { knownDataCoverage: coverage, status: "insufficient_data" };
  }
  const totalMinutes = minutes.reduce((sum, value) => sum + value, 0);
  const hours = totalMinutes / 60;
  const rows = resolveRows(input);
  return {
    totalMinutes,
    applicationsPerHour: hours > 0 ? safeRate(rows.filter((item) => item.applied).length, hours) : undefined,
    screeningsPerHour: hours > 0 ? safeRate(rows.filter((item) => item.screening).length, hours) : undefined,
    offersPerHour: hours > 0 ? safeRate(rows.filter((item) => item.offer).length, hours) : undefined,
    knownDataCoverage: coverage,
    status: coverage < 0.2 ? "insufficient_data" : "ready",
  };
}

function minutesFor(effort: { personalizationMinutes?: number; networkingMinutes?: number; interviewPrepMinutes?: number }): number {
  return (effort.personalizationMinutes ?? 0) + (effort.networkingMinutes ?? 0) + (effort.interviewPrepMinutes ?? 0);
}

export { categoryFromKey, comparisonConfidence, OBSERVED_ASSOCIATION_DISCLAIMER, resolvedRejection };
