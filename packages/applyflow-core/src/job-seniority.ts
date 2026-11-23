import type { Evidence } from "./evidence-types.js";
import { normalizeJobTextForIntel } from "./job-intelligence.js";

/**
 * Seniority of a posting and of a candidate, from explicit evidence only.
 * The posting title wins over the body; titles quoted from partners or org charts
 * in the body are ignored. Founder roles are never read as formal people management.
 */

export const ROLE_LEVELS = ["junior", "mid", "senior", "staff", "lead", "principal", "manager"] as const;
export type RoleLevel = (typeof ROLE_LEVELS)[number];

const LEVEL_PATTERNS: { level: RoleLevel; pattern: RegExp }[] = [
  { level: "manager", pattern: /\b(?:engineering|software|development|technical|tech)\s+manager\b|\bhead of (?:engineering|technology|development)\b/ },
  { level: "principal", pattern: /\bprincipal\b/ },
  { level: "staff", pattern: /\bstaff\b/ },
  { level: "lead", pattern: /\btech(?:nical)?\s+lead\b|\bteam\s+lead\b|\blead\s+(?:engineer|developer|software)\b|\bengineering\s+lead\b/ },
  { level: "senior", pattern: /\bsenior\b|\bsr\.?(?=\s)|\bsenior-level\b/ },
  { level: "mid", pattern: /\bmid[\s-]?level\b|\bpleno\b/ },
  { level: "junior", pattern: /\bjunior\b|\bjr\.?(?=\s)/ },
];

const RANK: Record<RoleLevel, number> = {
  junior: 1,
  mid: 2,
  senior: 3,
  staff: 4,
  lead: 4,
  principal: 5,
  manager: 5,
};

export type PostingSeniority = {
  level: RoleLevel | "unknown";
  /** Other levels the title accepts ("Senior / Staff"). */
  alternatives: RoleLevel[];
  source: "title" | "description" | "none";
  extractedText?: string;
};

export function detectRoleLevels(text: string): RoleLevel[] {
  const folded = normalizeJobTextForIntel(text);
  return LEVEL_PATTERNS.filter((item) => item.pattern.test(folded)).map((item) => item.level);
}

function lowest(levels: readonly RoleLevel[]): RoleLevel {
  return [...levels].sort((left, right) => RANK[left] - RANK[right])[0] as RoleLevel;
}

/** Title-like spots in the body: the first line and explicit hiring phrases. */
function titleLikeSnippets(text: string): string[] {
  const firstLine = text.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? "";
  const firstSentence = firstLine.split(/[.!?]\s/)[0] ?? "";
  const snippets = firstSentence.length > 0 && firstSentence.length <= 120 ? [firstSentence] : [];
  const hiring =
    /\b(?:we(?:'|’)?re|we are)\s+(?:looking for|hiring|seeking)\s+(?:a|an)\s+([^.,;\n]{3,80})|\b(?:job title|position|role)\s*:\s*([^.\n]{3,80})/gi;
  for (const match of text.matchAll(hiring)) {
    const snippet = match[1] ?? match[2];
    if (snippet) snippets.push(snippet);
  }
  return snippets;
}

export function postingSeniority(input: { title?: string; text: string }): PostingSeniority {
  const title = input.title?.trim();
  if (title) {
    const levels = detectRoleLevels(title);
    if (levels.length > 0) {
      const level = lowest(levels);
      return { level, alternatives: levels.filter((item) => item !== level), source: "title", extractedText: title };
    }
  }
  for (const snippet of titleLikeSnippets(input.text)) {
    const levels = detectRoleLevels(snippet);
    if (levels.length > 0) {
      const level = lowest(levels);
      return {
        level,
        alternatives: levels.filter((item) => item !== level),
        source: "description",
        extractedText: snippet.trim(),
      };
    }
  }
  return { level: "unknown", alternatives: [], source: "none" };
}

function isRoleEvidence(item: Evidence): boolean {
  return item.sourceRef === "profile.roles" || item.kind === "experience_period";
}

export type CandidateSeniority = {
  level: RoleLevel | "unknown";
  evidence: Evidence[];
};

/** Highest explicitly documented level. Founder/owner titles do not imply a level. */
export function candidateSeniority(evidence: readonly Evidence[]): CandidateSeniority {
  let best: RoleLevel | "unknown" = "unknown";
  const supporting: Evidence[] = [];
  for (const item of evidence) {
    if (!isRoleEvidence(item) || item.stance === "absent") continue;
    const levels = detectRoleLevels(item.label);
    if (levels.length === 0) continue;
    const top = [...levels].sort((left, right) => RANK[right] - RANK[left])[0] as RoleLevel;
    if (best === "unknown" || RANK[top] > RANK[best]) {
      best = top;
      supporting.unshift(item);
    } else {
      supporting.push(item);
    }
  }
  return { level: best, evidence: supporting.slice(0, 3) };
}

export function satisfiesLevel(candidate: RoleLevel, required: RoleLevel): boolean {
  if (required === "manager") return candidate === "manager";
  if (candidate === "manager") return RANK[required] <= RANK.senior;
  return RANK[candidate] >= RANK[required];
}
