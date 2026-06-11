import type { CareerSyncSignal } from "../shared/types.js";

function countStages(signals: CareerSyncSignal[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const signal of signals) {
    const stage = signal.processStage ?? "unknown";
    counts[stage] = (counts[stage] ?? 0) + 1;
  }
  return counts;
}

function dedupeCompanyHints(signals: CareerSyncSignal[]): string[] {
  const seen = new Set<string>();
  const hints: string[] = [];
  for (const signal of signals) {
    const hint = signal.companyHint?.trim();
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

export function summarizeGmailSignals(signals: CareerSyncSignal[]): string {
  const actionRequiredCount = signals.filter((s) => s.actionRequired).length;
  const stageCounts = countStages(signals);
  const companies = dedupeCompanyHints(signals);

  const parts = [
    `Gmail sync: ${signals.length} signal(s), ${actionRequiredCount} require action.`,
    `Stages: ${formatStageCounts(stageCounts) || "none"}.`,
  ];

  if (companies.length > 0) {
    parts.push(`Companies: ${companies.join(", ")}.`);
  }

  return parts.join(" ");
}

export { countStages, dedupeCompanyHints };
