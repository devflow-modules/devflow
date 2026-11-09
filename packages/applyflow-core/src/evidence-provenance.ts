import type { Evidence } from "./evidence-types.js";
import { normalizeJobTextForIntel } from "./job-intelligence.js";
import { textMentionsTechnology } from "./technology-identity.js";

export const EVIDENCE_SOURCE_KINDS = [
  "professional_experience",
  "project",
  "candidate_declared",
  "derived",
] as const;

export type EvidenceSourceKind = (typeof EVIDENCE_SOURCE_KINDS)[number];

export type EvidenceSupport = "direct" | "partial" | "unknown";

/**
 * Derived provenance. It does not replace the stored evidence record.
 * `sourceText` is the narrow passage used for the explanation.
 */
export type EvidenceProvenance = {
  resumeId?: string;
  evidenceId?: string;
  sourceKind: EvidenceSourceKind;
  projectName?: string;
  requirementId?: string;
  sourceText?: string;
  ambiguous: boolean;
  support: EvidenceSupport;
};

export type EvidencePassage = {
  evidenceId: string;
  projectName?: string;
  text: string;
  ambiguous: boolean;
};

const ROLE_OR_TECH = new Set([
  "api",
  "aws",
  "crm",
  "docker",
  "engineer",
  "frontend",
  "full",
  "hmac",
  "java",
  "javascript",
  "kubernetes",
  "next",
  "node",
  "playwright",
  "postgres",
  "postgresql",
  "prisma",
  "product",
  "python",
  "react",
  "saas",
  "senior",
  "sql",
  "stack",
  "typescript",
  "vitest",
]);

function fold(value: string): string {
  return normalizeJobTextForIntel(value);
}

function sourceKindOf(item: Evidence, passage: EvidencePassage): EvidenceSourceKind {
  if (item.origin === "candidate_declaration" || item.subject === "language") return "candidate_declared";
  if (passage.projectName || item.subject === "project") return "project";
  return "professional_experience";
}

export function deriveEvidencePassages(item: Evidence): EvidencePassage[] {
  const description = item.description.trim();
  const headed = headedPassages(item.id, description);
  if (headed.length > 0) return headed;
  const names = projectLikeNames(`${item.label}. ${description}`);
  const listedNames = names.filter((name) =>
    new RegExp(`(?:^|[,;]|\\band\\b)\\s*${escapeRegExp(name)}\\b`).test(`${item.label}. ${description}`),
  );
  const ambiguous = !item.project && listedNames.length >= 2;
  return [
    {
      evidenceId: item.id,
      projectName: ambiguous ? undefined : item.project?.trim() || undefined,
      text: [item.label, description, ...(item.technologies ?? [])].filter(Boolean).join(". "),
      ambiguous,
    },
  ];
}

export function rankEvidenceForRequirement(
  requirementText: string,
  evidence: readonly Evidence[],
): Array<{ evidence: Evidence; passage: EvidencePassage; score: number }> {
  return evidence
    .map((item) => {
      const passages = deriveEvidencePassages(item);
      const best = passages
        .map((passage) => ({ passage, score: scorePassage(requirementText, passage) }))
        .sort((left, right) => right.score - left.score)[0];
      return {
        evidence: item,
        passage: best?.passage ?? {
          evidenceId: item.id,
          text: item.description,
          ambiguous: false,
        },
        score: best?.score ?? 0,
      };
    })
    .sort((left, right) => right.score - left.score);
}

export function provenanceForEvidence(
  item: Evidence,
  requirementText: string,
  options?: { resumeId?: string; requirementId?: string; support?: EvidenceSupport },
): EvidenceProvenance {
  const ranked = rankEvidenceForRequirement(requirementText, [item])[0];
  const passage = ranked?.passage ?? { evidenceId: item.id, text: item.description, ambiguous: false };
  return {
    resumeId: options?.resumeId,
    evidenceId: item.id,
    sourceKind: sourceKindOf(item, passage),
    projectName: passage.ambiguous ? undefined : passage.projectName,
    requirementId: options?.requirementId,
    sourceText: passage.text.slice(0, 280),
    ambiguous: passage.ambiguous,
    support: options?.support ?? (passage.ambiguous ? "partial" : "direct"),
  };
}

export function explainProvenance(provenance: EvidenceProvenance): string {
  const project = provenance.projectName ? `${provenance.projectName} — ` : "";
  const text = provenance.sourceText ? `${project}${provenance.sourceText}` : "No isolated passage was available.";
  if (provenance.ambiguous) return `Ambiguous source. ${text}`;
  if (provenance.sourceKind === "candidate_declared") return `Candidate-declared. ${text}`;
  if (provenance.support === "unknown") return `Unknown support. ${text}`;
  return text;
}

export function unsupportedMeasuredOutcome(claim: string, evidence: readonly Evidence[]): boolean {
  const match = claim.match(/\b(?:increased|reduced|improved|grew|decreased|cut)\b[^.]{0,80}?(\d+(?:\.\d+)?)\s*%/i);
  if (!match?.[1]) return false;
  return !evidence.some((item) =>
    deriveEvidencePassages(item).some((passage) => !passage.ambiguous && passage.text.includes(match[1] ?? "")),
  );
}

export function unsupportedManagementClaim(claim: string, evidence: readonly Evidence[]): boolean {
  const match = claim.match(/\b(?:managed|led)\b[^.]{0,40}?(\d+)\b[^.]{0,30}?\b(?:engineers|people|reports)\b/i);
  if (!match?.[1]) return false;
  const count = match[1];
  return !evidence.some((item) =>
    deriveEvidencePassages(item).some((passage) => {
      if (passage.ambiguous) return false;
      if (/\bnot a people-manager\b/i.test(passage.text)) return false;
      return passage.text.includes(count) && /\b(managed|manager|reports|engineers)\b/i.test(passage.text);
    }),
  );
}

export function wrongProjectAttribution(claim: string, evidence: readonly Evidence[]): string | undefined {
  const ranked = rankEvidenceForRequirement(claim, evidence).filter((item) => item.score > 0);
  const best = ranked[0];
  if (best?.passage.ambiguous) {
    const named = projectLikeNames(best.passage.text).find((name) => new RegExp(`\\b${escapeRegExp(name)}\\b`).test(claim));
    if (named) return "The evidence names more than one project and does not isolate this claim.";
  }
  const names = evidence
    .flatMap((item) => deriveEvidencePassages(item))
    .filter((passage) => passage.projectName && !passage.ambiguous)
    .map((passage) => passage.projectName as string)
    .sort((left, right) => right.length - left.length);
  const unique = [...new Set(names)];
  const named = unique.find((name) => new RegExp(`\\b${escapeRegExp(name)}\\b`, "i").test(claim));
  if (!named) return undefined;
  if (!best) return "The named project is not isolated by the selected evidence.";
  if (best.passage.ambiguous || !best.passage.projectName) {
    return "The evidence names more than one project and does not isolate this claim.";
  }
  if (fold(best.passage.projectName) !== fold(named)) {
    return `The claim attributes the work to ${named}, but the supporting passage is ${best.passage.projectName}.`;
  }
  return undefined;
}

function headedPassages(evidenceId: string, description: string): EvidencePassage[] {
  const passages: EvidencePassage[] = [];
  for (const line of description.split(/\n+/)) {
    const match = line.trim().match(/^([A-Z][\p{L}\p{N}+.'’/& -]{1,70}?)\s+[—–:-]\s+(\S.{8,})$/u);
    if (!match?.[1] || !match[2]) continue;
    const name = match[1].trim();
    if (name.split(/\s+/).length > 6) continue;
    if (/^(i|we|the|a|an|this|my)\b/i.test(name)) continue;
    passages.push({
      evidenceId,
      projectName: name,
      text: match[2].trim(),
      ambiguous: false,
    });
  }
  return passages;
}

function projectLikeNames(text: string): string[] {
  const matches = text.match(/\b[A-Z][\p{L}\p{N}+]*(?:\s+[A-Z][\p{L}\p{N}+]*){0,3}/gu) ?? [];
  return matches.filter((name) => {
    const parts = name.split(/\s+/);
    return parts.some((part) => part.length > 2 && !ROLE_OR_TECH.has(part.toLowerCase()));
  });
}

const GENERIC_PASSAGE_TOKENS = new Set([
  "about",
  "build",
  "built",
  "experience",
  "engineer",
  "engineering",
  "feature",
  "features",
  "from",
  "have",
  "ownership",
  "platform",
  "product",
  "production",
  "professional",
  "project",
  "required",
  "senior",
  "service",
  "services",
  "software",
  "system",
  "systems",
  "that",
  "this",
  "using",
  "with",
  "work",
  "working",
  "years",
]);

function scorePassage(requirementText: string, passage: EvidencePassage): number {
  const tokens = fold(requirementText)
    .split(/[^a-z0-9+#]+/)
    .filter((token) => token.length >= 4 && !GENERIC_PASSAGE_TOKENS.has(token));
  const sentences = passage.text.split(/(?<=[.!?])\s+|\n+/);
  let hits = 0;
  for (const token of tokens) {
    const supported = sentences.some((sentence) => sentenceSupports(sentence, token));
    if (supported) hits += 1;
  }
  if (hits === 0) return 0;
  if (passage.ambiguous) return hits;
  if (passage.projectName) return hits + 100;
  return hits + 10;
}

function sentenceSupports(sentence: string, token: string): boolean {
  if (!textMentionsTechnology(sentence, token)) return false;
  const folded = fold(sentence);
  const at = folded.indexOf(fold(token));
  const window = at >= 0 ? folded.slice(Math.max(0, at - 40), at) : folded;
  return !/\b(not|no|never|without)\b/.test(window);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
