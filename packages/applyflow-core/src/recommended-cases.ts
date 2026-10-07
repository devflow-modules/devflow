/**
 * Canonical case labels for outreach / interview routing.
 * Contacts store free-text `recommendedCases`; these ids are the stable vocabulary.
 */
export const RECOMMENDED_CASE_IDS = [
  "ApplyFlow",
  "Prospecta",
  "WhatsApp Platform",
  "Na Braza",
  "Investiga+",
  "FlexCargo",
  "HealthSafe / Mavvitech",
  "T2S / .NET B2B",
  "VibeSec",
] as const;

export type RecommendedCaseId = (typeof RECOMMENDED_CASE_IDS)[number];

export function normalizeRecommendedCases(values: readonly string[] | undefined): string[] | undefined {
  if (!values?.length) return undefined;
  const next = values.map((item) => item.trim()).filter(Boolean);
  return next.length ? [...new Set(next)] : undefined;
}
