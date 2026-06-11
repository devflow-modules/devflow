import type { CareerSyncSignal } from "../shared/types.js";
import { countUpcomingSignals, dedupeCompanyHints } from "../calendar-sync/summarize-calendar-signals.js";
import { countStages } from "../gmail-sync/summarize-gmail-signals.js";
import type { CareerBundleSyncSource, CareerBundleSyncSummary } from "./types.js";

const DEFAULT_NOW = "1970-01-01T00:00:00.000Z";

function formatStageCounts(counts: Record<string, number>): string {
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([stage, count]) => `${stage}=${count}`)
    .join(", ");
}

export function sortCombinedSignals(signals: CareerSyncSignal[]): CareerSyncSignal[] {
  return [...signals].sort((a, b) => {
    const aEventMs = a.eventAt ? Date.parse(a.eventAt) : Number.NaN;
    const bEventMs = b.eventAt ? Date.parse(b.eventAt) : Number.NaN;
    const aHasEvent = !Number.isNaN(aEventMs);
    const bHasEvent = !Number.isNaN(bEventMs);

    if (aHasEvent && bHasEvent && aEventMs !== bEventMs) {
      return aEventMs - bEventMs;
    }
    if (aHasEvent !== bHasEvent) {
      return aHasEvent ? -1 : 1;
    }

    const aReceivedMs = a.receivedAt ? Date.parse(a.receivedAt) : Number.NaN;
    const bReceivedMs = b.receivedAt ? Date.parse(b.receivedAt) : Number.NaN;
    if (!Number.isNaN(aReceivedMs) && !Number.isNaN(bReceivedMs) && aReceivedMs !== bReceivedMs) {
      return bReceivedMs - aReceivedMs;
    }

    return a.id.localeCompare(b.id);
  });
}

export function buildCareerBundleSyncSummary(
  signals: CareerSyncSignal[],
  now: string = DEFAULT_NOW,
): CareerBundleSyncSummary {
  return {
    totalSignals: signals.length,
    actionRequiredCount: signals.filter((signal) => signal.actionRequired).length,
    upcomingCount: countUpcomingSignals(signals, now),
    stageCounts: countStages(signals),
    sourceCounts: {
      gmail: signals.filter((signal) => signal.source === "gmail").length,
      calendar: signals.filter((signal) => signal.source === "calendar").length,
    },
    companyHints: dedupeCompanyHints(signals),
  };
}

export function summarizeCareerBundleSync(
  signals: CareerSyncSignal[],
  stats?: CareerBundleSyncSummary,
): string {
  const resolved =
    stats ??
    buildCareerBundleSyncSummary(signals);

  const parts = [
    `CareerBundle sync: ${resolved.totalSignals} signal(s), ${resolved.actionRequiredCount} action required, ${resolved.upcomingCount} upcoming.`,
    `Sources: gmail=${resolved.sourceCounts.gmail}, calendar=${resolved.sourceCounts.calendar}.`,
    `Stages: ${formatStageCounts(resolved.stageCounts) || "none"}.`,
  ];

  if (resolved.companyHints.length > 0) {
    parts.push(`Companies: ${resolved.companyHints.join(", ")}.`);
  }

  return parts.join(" ");
}

export { DEFAULT_NOW as CAREER_BUNDLE_SYNC_DEFAULT_NOW };
