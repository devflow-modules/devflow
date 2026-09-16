import { confidenceFromSampleSize } from "./analytics-confidence.js";
import {
  computeFitBandPerformance,
  computeGapFrequency,
  computeNetworkingPerformance,
  computePriorityPerformance,
  computeResumePerformance,
  computeRolePerformance,
  computeSourcePerformance,
} from "./career-analytics.js";
import type { CareerAnalyticsInput, CareerInsight } from "./career-analytics-types.js";

const CAUSAL_GUARD =
  /\b(caused|causes|proves|guarantees|doubles your chances|increases your chances|makes you more likely)\b/i;

export function insightUsesCausalLanguage(text: string): boolean {
  return CAUSAL_GUARD.test(text);
}

export function generateCareerInsights(input: CareerAnalyticsInput): CareerInsight[] {
  const applications = input.applications.length;
  if (applications === 0 && (input.decisions?.length ?? 0) === 0) {
    return [
      {
        id: "insight-empty",
        type: "insufficient_data",
        title: "Insufficient data",
        description: "No applications or decisions are available in the current dataset.",
        metrics: { sampleSize: 0 },
        confidence: "low",
        sampleSize: 0,
      },
    ];
  }

  const insights: CareerInsight[] = [];
  const roles = computeRolePerformance(input).filter((item) => item.applications > 0);
  if (roles.length >= 2) {
    const ranked = [...roles].sort((a, b) => b.screeningRate - a.screeningRate || b.applications - a.applications);
    const top = ranked[0]!;
    const other = ranked[1]!;
    insights.push({
      id: "insight-role",
      type: "positive_pattern",
      title: `${top.roleType} reached screening more often in this dataset`,
      description: `${top.roleType} applications reached screening more often than ${other.roleType} applications in the current dataset.`,
      metrics: {
        topRate: top.screeningRate,
        otherRate: other.screeningRate,
        sampleSize: Math.min(top.sampleSize, other.sampleSize),
      },
      confidence: confidenceFromSampleSize(Math.min(top.sampleSize, other.sampleSize)),
      sampleSize: Math.min(top.sampleSize, other.sampleSize),
    });
  }

  const bands = computeFitBandPerformance(input).filter((item) => item.applications > 0);
  const high = bands.find((item) => item.band === "80-89");
  const mid = bands.find((item) => item.band === "60-69");
  if (high && mid && high.screeningRate > mid.screeningRate) {
    insights.push({
      id: "insight-fit-band",
      type: "positive_pattern",
      title: "Higher fit band had a higher observed screening rate",
      description:
        "Applications in the 80–89 fit band reached screening more often than applications in the 60–69 band in the current dataset.",
      metrics: { highRate: high.screeningRate, midRate: mid.screeningRate, sampleSize: Math.min(high.sampleSize, mid.sampleSize) },
      confidence: confidenceFromSampleSize(Math.min(high.sampleSize, mid.sampleSize)),
      sampleSize: Math.min(high.sampleSize, mid.sampleSize),
    });
  }

  const resumes = computeResumePerformance(input).filter((item) => item.applications > 0);
  if (resumes.length >= 2) {
    const ranked = [...resumes].sort((a, b) => b.screeningRate - a.screeningRate);
    const leader = ranked[0]!;
    insights.push({
      id: "insight-resume",
      type: leader.confidence === "low" ? "insufficient_data" : "resume_pattern",
      title: `${leader.resumeVariant} had the higher observed screening rate`,
      description:
        leader.confidence === "low"
          ? `${leader.resumeVariant} shows a higher observed screening rate, but the sample is small so this is low-confidence.`
          : `${leader.resumeVariant} had a higher observed screening rate than other variants in the current dataset.`,
      metrics: { rate: leader.screeningRate, sampleSize: leader.sampleSize },
      confidence: leader.confidence,
      sampleSize: leader.sampleSize,
    });
  }

  const networking = computeNetworkingPerformance(input);
  const withNet = networking.find((item) => item.cohort === "with_networking");
  const without = networking.find((item) => item.cohort === "without_networking");
  if (withNet && without && (withNet.applications > 0 || without.applications > 0)) {
    insights.push({
      id: "insight-networking",
      type: "networking_pattern",
      title: "Networking cohort comparison is observational",
      description:
        withNet.responseRate >= without.responseRate
          ? `Applications with networking had a higher observed reply rate in the current dataset. ${withNet.disclaimer}`
          : `Networking and non-networking cohorts were compared in the current dataset. ${withNet.disclaimer}`,
      metrics: { withRate: withNet.responseRate, withoutRate: without.responseRate, sampleSize: Math.min(withNet.sampleSize, without.sampleSize) },
      confidence: confidenceFromSampleSize(Math.min(withNet.sampleSize, without.sampleSize)),
      sampleSize: Math.min(withNet.sampleSize, without.sampleSize),
    });
  }

  const gaps = computeGapFrequency(input).sort((a, b) => b.highPriorityFrequency - a.highPriorityFrequency);
  const topGap = gaps[0];
  if (topGap && topGap.gapCount > 0) {
    insights.push({
      id: "insight-gap",
      type: "gap_pattern",
      title: `${topGap.label} is a recurring GAP in high-priority jobs`,
      description: `${topGap.label} appears as a GAP in ${Math.round(topGap.highPriorityFrequency * 100)}% of your high-priority jobs.`,
      metrics: { frequency: topGap.highPriorityFrequency, gapCount: topGap.gapCount, jobsCount: topGap.jobsCount },
      confidence: confidenceFromSampleSize(topGap.jobsCount),
      sampleSize: topGap.jobsCount,
    });
  }

  const sources = computeSourcePerformance(input).filter((item) => item.applications > 0);
  if (sources[0]) {
    insights.push({
      id: "insight-source",
      type: "source_pattern",
      title: `${sources[0].source} is the most used source in this dataset`,
      description: `${sources[0].source} accounts for ${sources[0].applications} applications in the current dataset.`,
      metrics: { applications: sources[0].applications, screeningRate: sources[0].screeningRate },
      confidence: sources[0].confidence,
      sampleSize: sources[0].sampleSize,
    });
  }

  const priority = computePriorityPerformance(input).filter((item) => item.kind === "decision" && item.applications > 0);
  if (priority.length >= 2) {
    insights.push({
      id: "insight-priority",
      type: "priority_pattern",
      title: "Decision cohorts can be compared in this dataset",
      description: "APPLY_HIGH, APPLY_NORMAL and APPLY_STRETCH are compared from observed outcomes in the current dataset.",
      metrics: { cohorts: priority.length, sampleSize: priority.reduce((sum, item) => sum + item.sampleSize, 0) },
      confidence: confidenceFromSampleSize(Math.min(...priority.map((item) => item.sampleSize))),
      sampleSize: Math.min(...priority.map((item) => item.sampleSize)),
    });
  }

  const cleaned = insights.filter((item) => !insightUsesCausalLanguage(`${item.title} ${item.description}`));
  if (cleaned.length === 0) {
    return [
      {
        id: "insight-insufficient",
        type: "insufficient_data",
        title: "Insufficient data",
        description: "The current dataset does not support a stable observed pattern yet.",
        metrics: { sampleSize: applications },
        confidence: "low",
        sampleSize: applications,
      },
    ];
  }
  return cleaned;
}
