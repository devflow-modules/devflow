import type { ProcessStage, RawGmailMessageLike, SyncConfidence } from "../shared/types.js";
import { combineText, normalizeLower, normalizeText } from "../shared/normalize.js";
import { containsCareerKeyword, requiresAction } from "../privacy/filters.js";

type StageMatch = { stage: ProcessStage; confidence: SyncConfidence };

const STAGE_RULES: Array<{ pattern: RegExp; stage: ProcessStage; confidence: SyncConfidence }> = [
  { pattern: /\b(rejected|infelizmente|n[aã]o avan[cç]aremos|not moving forward|unfortunately)\b/i, stage: "rejected", confidence: "high" },
  { pattern: /\b(offer|proposta|job offer)\b/i, stage: "offer", confidence: "high" },
  { pattern: /\b(technical|t[eé]cnico|desafio|take[- ]home|assignment)\b/i, stage: "technical", confidence: "high" },
  { pattern: /\b(interview|entrevista)\b/i, stage: "interview", confidence: "high" },
  { pattern: /\b(screening|triagem|recruiter|talent|people ops)\b/i, stage: "screening", confidence: "medium" },
  { pattern: /\b(applied|application received|candidatura)\b/i, stage: "applied", confidence: "medium" },
  { pattern: /\b(sourced|talent pool|headhunt)\b/i, stage: "sourced", confidence: "low" },
];

export function inferGmailProcessStage(text: string): StageMatch {
  const haystack = normalizeLower(text);
  if (!haystack) return { stage: "unknown", confidence: "low" };

  for (const rule of STAGE_RULES) {
    if (rule.pattern.test(haystack)) {
      return { stage: rule.stage, confidence: rule.confidence };
    }
  }

  if (containsCareerKeyword(haystack)) {
    return { stage: "unknown", confidence: "medium" };
  }

  return { stage: "unknown", confidence: "low" };
}

export function inferRoleHint(subject: string | undefined): string | undefined {
  const s = normalizeText(subject);
  if (!s) return undefined;
  const match = s.match(/(?:for|para|vaga)\s+[:—-]?\s*(.+)$/i);
  if (match?.[1]) return match[1].slice(0, 120);
  return s.length <= 120 ? s : s.slice(0, 117) + "…";
}

export function gmailMessageCorpus(message: RawGmailMessageLike): string {
  return combineText([message.subject, message.snippet]);
}
