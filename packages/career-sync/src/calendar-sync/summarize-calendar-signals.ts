import type { CareerSyncSignal } from "../shared/types.js";

function countStages(signals: CareerSyncSignal[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const signal of signals) {
    const stage = signal.processStage ?? "unknown";
    counts[stage] = (counts[stage] ?? 0) + 1;
  }
  return counts;
}

function hintFromSummary(summary: string | undefined): string | undefined {
  const text = summary?.trim();
  if (!text) return undefined;
  const match = text.match(/—\s*([A-Za-z][A-Za-z0-9]*)/);
  return match?.[1];
}

function dedupeCompanyHints(signals: CareerSyncSignal[]): string[] {
  const seen = new Set<string>();
  const hints: string[] = [];
  for (const signal of signals) {
    const hint = signal.companyHint?.trim() || hintFromSummary(signal.safeSummary);
    if (!hint || seen.has(hint)) continue;
    seen.add(hint);
    hints.push(hint);
  }
  return hints.sort((a, b) => a.localeCompare(b));
}

function formatStageCounts(counts: Record<string, number>): string {
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([stage, count]) => `${stage}=${count}`)
    .join(", ");
}

export function countUpcomingSignals(signals: CareerSyncSignal[], now: string): number {
  const nowMs = Date.parse(now);
  if (Number.isNaN(nowMs)) return 0;
  return signals.filter((signal) => {
    if (!signal.eventAt) return false;
    const eventMs = Date.parse(signal.eventAt);
    return !Number.isNaN(eventMs) && eventMs > nowMs;
  }).length;
}

export function summarizeCalendarSignals(signals: CareerSyncSignal[], now?: string): string {
  const stageCounts = countStages(signals);
  const companies = dedupeCompanyHints(signals);
  const upcomingCount = now ? countUpcomingSignals(signals, now) : 0;

  const parts = [
    `Calendar sync: ${signals.length} signal(s), ${upcomingCount} upcoming.`,
    `Stages: ${formatStageCounts(stageCounts) || "none"}.`,
  ];

  if (companies.length > 0) {
    parts.push(`Companies: ${companies.join(", ")}.`);
  }

  return parts.join(" ");
}

export { countStages, dedupeCompanyHints };
