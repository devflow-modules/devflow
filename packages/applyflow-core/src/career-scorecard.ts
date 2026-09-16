import { getPeriodCreatedAtFloor, type ApplicationsPeriodFilter } from "./application-metrics.js";
import { safeRate } from "./analytics-confidence.js";
import {
  computeFunnelMetrics,
  computeGapFrequency,
  computeNetworkingPerformance,
  computeResumePerformance,
  computeRolePerformance,
  computeSourcePerformance,
} from "./career-analytics.js";
import type { CareerAnalyticsInput } from "./career-analytics-types.js";

export type CareerScorecard = {
  period: ApplicationsPeriodFilter;
  jobsFound: number;
  jobsQualified: number;
  applications: number;
  replies: number;
  screenings: number;
  technicals: number;
  finals: number;
  offers: number;
  responseRate: number;
  screeningRate: number;
  offerRate: number;
  averageFit?: number;
  averageAppliedFit?: number;
  topRoleType?: string;
  topSource?: string;
  topResume?: string;
  topRecurringGap?: string;
  networkingCoverage?: number;
  followUpCoverage?: number;
};

export type WeeklyOperatingMetrics = {
  period: ApplicationsPeriodFilter;
  jobsFound: number;
  jobsQualified: number;
  applications: number;
  contacts: number;
  followUps: number;
  screenings: number;
  previous?: Omit<WeeklyOperatingMetrics, "period" | "previous">;
};

function inPeriod<T extends { createdAt?: string }>(items: readonly T[], period: ApplicationsPeriodFilter, now: Date): T[] {
  const floor = getPeriodCreatedAtFloor(period, now);
  const until = now.getTime();
  if (floor == null) return [...items];
  return items.filter((item) => {
    const t = item.createdAt ? Date.parse(item.createdAt) : NaN;
    return Number.isFinite(t) && t >= floor && t <= until;
  });
}

export function buildCareerScorecard(
  input: CareerAnalyticsInput,
  period: ApplicationsPeriodFilter = "all",
): CareerScorecard {
  const now = input.now ?? new Date();
  const scoped: CareerAnalyticsInput = {
    ...input,
    applications: inPeriod(input.applications, period, now),
    jobs: input.jobs ? inPeriod(input.jobs, period, now) : input.jobs,
    contacts: input.contacts ? inPeriod(input.contacts, period, now) : input.contacts,
  };
  const funnel = computeFunnelMetrics(scoped);
  const fits = scoped.applications.map((item) => item.fitScore).filter((item): item is number => typeof item === "number");
  const appliedFits = scoped.applications
    .filter((item) => item.status !== "reviewing" && item.status !== "ignored")
    .map((item) => item.fitScore)
    .filter((item): item is number => typeof item === "number");
  const networking = computeNetworkingPerformance(scoped);
  const withNet = networking.find((item) => item.cohort === "with_networking");
  return {
    period,
    jobsFound: funnel.counts.FOUND,
    jobsQualified: funnel.counts.QUALIFIED,
    applications: funnel.counts.APPLIED,
    replies: funnel.counts.RECRUITER_CONTACTED,
    screenings: funnel.counts.SCREENING,
    technicals: funnel.counts.TECHNICAL,
    finals: funnel.counts.FINAL,
    offers: funnel.counts.OFFER,
    responseRate: funnel.conversionRates.appliedToResponse,
    screeningRate: funnel.conversionRates.appliedToScreening,
    offerRate: funnel.conversionRates.appliedToOffer,
    averageFit: fits.length ? Math.round(fits.reduce((sum, value) => sum + value, 0) / fits.length) : undefined,
    averageAppliedFit: appliedFits.length
      ? Math.round(appliedFits.reduce((sum, value) => sum + value, 0) / appliedFits.length)
      : undefined,
    topRoleType: computeRolePerformance(scoped)[0]?.roleType,
    topSource: computeSourcePerformance(scoped)[0]?.source,
    topResume: computeResumePerformance(scoped)[0]?.resumeVariant,
    topRecurringGap: computeGapFrequency(scoped).sort((a, b) => b.highPriorityFrequency - a.highPriorityFrequency)[0]?.label,
    networkingCoverage: scoped.applications.length ? safeRate(withNet?.applications ?? 0, scoped.applications.length) : undefined,
  };
}

function operatingWindow(
  input: CareerAnalyticsInput,
  period: ApplicationsPeriodFilter,
  now: Date,
): Omit<WeeklyOperatingMetrics, "period" | "previous"> {
  const currentApps = inPeriod(input.applications, period, now);
  const currentJobs = input.jobs ? inPeriod(input.jobs, period, now) : [];
  const currentContacts = input.contacts ? inPeriod(input.contacts, period, now) : [];
  const funnel = computeFunnelMetrics({ ...input, applications: currentApps, jobs: currentJobs, now });
  const followUps = (input.interactions ?? []).filter((item) => {
    if (item.type !== "follow_up") return false;
    const t = Date.parse(item.occurredAt);
    const floor = getPeriodCreatedAtFloor(period, now);
    return Number.isFinite(t) && (floor == null || t >= floor);
  }).length;
  return {
    jobsFound: funnel.counts.FOUND,
    jobsQualified: funnel.counts.QUALIFIED,
    applications: currentApps.length,
    contacts: currentContacts.length,
    followUps,
    screenings: funnel.counts.SCREENING,
  };
}

export function computeWeeklyOperatingMetrics(
  input: CareerAnalyticsInput,
  period: ApplicationsPeriodFilter = "7d",
): WeeklyOperatingMetrics {
  const now = input.now ?? new Date();
  const current = operatingWindow(input, period, now);
  if (period === "all") return { period, ...current };
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const previousNow = new Date(now.getTime() - days * 86_400_000);
  return { period, ...current, previous: operatingWindow(input, period, previousNow) };
}
