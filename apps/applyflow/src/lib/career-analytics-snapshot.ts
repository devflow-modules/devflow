import { buildCareerAnalyticsInput } from "@/lib/career-analytics-dataset";
import { loadDashboardAnalytics } from "@/lib/local-analytics-storage";
import { loadDashboardContacts } from "@/lib/local-contact-storage";
import { loadDashboardImport } from "@/lib/local-import-storage";
import { loadDashboardJobs } from "@/lib/local-job-storage";
import {
  buildCareerScorecard,
  computeFunnelMetrics,
  computeGapFrequency,
  computeGapMap,
  computeNetworkingPerformance,
  computeOutreachMetrics,
  computeResumePerformance,
  computeRolePerformance,
  computeSourcePerformance,
  computeWeeklyOperatingMetrics,
  generateCareerInsights,
  type ApplyFlowApplication,
  type CareerInsight,
  type CareerScorecard,
  type OutreachMetrics,
} from "@devflow/applyflow-core";

import { CAREER_ANALYTICS_DISCLAIMER } from "@/components/dashboard/career-analytics-content";

export type CareerAnalyticsSnapshot = {
  historyApplications: ApplyFlowApplication[];
  scorecard: CareerScorecard | null;
  insights: CareerInsight[];
  funnelBars: { name: string; count: number }[];
  roles: { name: string; screeningRate: number; applications: number }[];
  sources: { name: string; applications: number }[];
  resumes: { name: string; screeningRate: number; confidence: string; sampleSize: number }[];
  networking: { name: string; responseRate: number }[];
  outreach: OutreachMetrics;
  gaps: { name: string; frequency: number }[];
  gapMap: { label: string; action: string }[];
  weekly: { applications: number; screenings: number; previous?: number } | null;
  disclaimer: string;
};

export function loadCareerAnalyticsSnapshot(): CareerAnalyticsSnapshot {
  const applications = loadDashboardImport()?.applications ?? [];
  const jobs = loadDashboardJobs().jobs;
  const analytics = loadDashboardAnalytics();
  const contacts = loadDashboardContacts();
  const input = buildCareerAnalyticsInput({
    applications,
    jobs,
    outcomes: analytics.outcomes,
    events: analytics.events,
    efforts: analytics.efforts,
    contacts: contacts.contacts,
    interactions: contacts.interactions,
  });
  const funnel = computeFunnelMetrics(input);
  const net = computeNetworkingPerformance(input);
  const week = computeWeeklyOperatingMetrics(input, "7d");

  return {
    historyApplications: applications,
    scorecard: buildCareerScorecard(input, "all"),
    insights: generateCareerInsights(input),
    funnelBars: Object.entries(funnel.counts).map(([name, count]) => ({ name, count })),
    roles: computeRolePerformance(input).map((item) => ({
      name: item.roleType,
      screeningRate: item.screeningRate,
      applications: item.applications,
    })),
    sources: computeSourcePerformance(input).map((item) => ({
      name: item.source,
      applications: item.applications,
    })),
    resumes: computeResumePerformance(input).map((item) => ({
      name: item.resumeVariant,
      screeningRate: item.screeningRate,
      confidence: item.confidence,
      sampleSize: item.sampleSize,
    })),
    networking: net.map((item) => ({ name: item.cohort, responseRate: item.responseRate })),
    outreach: computeOutreachMetrics(contacts.contacts),
    disclaimer: net[0]?.disclaimer ?? CAREER_ANALYTICS_DISCLAIMER,
    gaps: computeGapFrequency(input).map((item) => ({
      name: item.label,
      frequency: item.highPriorityFrequency,
    })),
    gapMap: computeGapMap(input).map((item) => ({ label: item.label, action: item.suggestedAction })),
    weekly: {
      applications: week.applications,
      screenings: week.screenings,
      previous: week.previous?.applications,
    },
  };
}
