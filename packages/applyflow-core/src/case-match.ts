import type { Evidence } from "./evidence-types.js";
import { normalizeJobTextForIntel } from "./job-intelligence.js";

export type CaseRecommendation = {
  project: string;
  score: number;
  reasons: string[];
  evidenceIds: string[];
  bestFor: string[];
};

const CASE_TAGS: { match: RegExp; tags: string[] }[] = [
  { match: /whatsapp/i, tags: ["ownership", "multi-tenancy", "architecture", "integrations"] },
  { match: /investiga/i, tags: ["auth", "fallback", "webhooks", "production SaaS"] },
  { match: /braza/i, tags: ["real client", "user-facing product", "external integration"] },
  { match: /mavvitech/i, tags: ["Python", "automation", "failure handling"] },
];

function fold(value: string): string {
  return normalizeJobTextForIntel(value);
}

function tagsFor(evidence: Evidence): string[] {
  const blob = `${evidence.label} ${evidence.project ?? ""} ${evidence.description}`;
  const extra = CASE_TAGS.find((item) => item.match.test(blob));
  const inferred: string[] = [];
  if (/\bmulti-?tenant/i.test(blob)) inferred.push("multi-tenancy");
  if (/\bownership\b|\b0-to-1\b/i.test(blob)) inferred.push("ownership");
  if (/\bwebhook/i.test(blob)) inferred.push("webhooks");
  if (/\bauth/i.test(blob)) inferred.push("auth");
  if (/\bpython\b/i.test(blob)) inferred.push("Python");
  if (/\bautomation\b/i.test(blob)) inferred.push("automation");
  return [...new Set([...(extra?.tags ?? []), ...inferred])];
}

function tokens(query: string): string[] {
  return fold(query)
    .split(/[^a-z0-9+#]+/)
    .filter((item) => item.length >= 3);
}

export function recommendCases(input: {
  evidence: readonly Evidence[];
  query: string;
  limit?: number;
}): CaseRecommendation[] {
  const queryTokens = tokens(input.query);
  const projects = input.evidence.filter((item) => item.subject === "project" && item.usableForClaims);
  const scored = projects.map((item) => {
    const tags = tagsFor(item);
    const hay = fold([item.label, item.description, ...(item.technologies ?? []), ...tags].join(" "));
    const hits = queryTokens.filter((token) => hay.includes(token) || tags.some((tag) => fold(tag).includes(token)));
    const score = Math.min(100, hits.length * 18 + (item.confidence === "strong" ? 20 : 8));
    return {
      project: item.project ?? item.label,
      score,
      reasons: hits.length
        ? hits.slice(0, 4).map((token) => `Matches “${token}” in the recorded case.`)
        : ["Shipped project on record; weaker match for this question."],
      evidenceIds: [item.id],
      bestFor: tags,
    };
  });
  return scored.sort((a, b) => b.score - a.score || a.project.localeCompare(b.project)).slice(0, input.limit ?? 4);
}
