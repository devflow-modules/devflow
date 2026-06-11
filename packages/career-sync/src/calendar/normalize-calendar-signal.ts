import type { ProcessStage, RawCalendarEventLike, SyncConfidence } from "../shared/types.js";
import { combineText, normalizeLower } from "../shared/normalize.js";
import { containsCareerKeyword } from "../privacy/filters.js";

type StageMatch = { stage: ProcessStage; confidence: SyncConfidence };

const STAGE_RULES: Array<{ pattern: RegExp; stage: ProcessStage; confidence: SyncConfidence }> = [
  { pattern: /\b(technical|t[eé]cnico)\b/i, stage: "technical", confidence: "high" },
  { pattern: /\b(interview|entrevista)\b/i, stage: "interview", confidence: "high" },
  { pattern: /\b(screening|recruiter)\b/i, stage: "screening", confidence: "medium" },
];

export function inferCalendarProcessStage(text: string): StageMatch {
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

export function calendarEventCorpus(event: RawCalendarEventLike): string {
  return combineText([event.summary, event.description]);
}

export function isCareerRelatedCalendarEvent(event: RawCalendarEventLike): boolean {
  const corpus = calendarEventCorpus(event);
  if (!corpus) return false;
  return containsCareerKeyword(corpus) || inferCalendarProcessStage(corpus).stage !== "unknown";
}
