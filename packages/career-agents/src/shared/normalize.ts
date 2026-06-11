import {
  KNOWN_SKILL_ALIASES,
  SKILL_DETECTION_PATTERNS,
  resolveCanonicalSkillName,
  toCareerSkill,
} from "./skills.js";
import type { CareerSkill } from "./types.js";

export { KNOWN_SKILL_ALIASES, resolveCanonicalSkillName, toCareerSkill } from "./skills.js";
export { SKILL_CATEGORY_MAP } from "./skills.js";

export function normalizeText(value: string | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

export function normalizeLower(value: string | undefined): string {
  return normalizeText(value).toLowerCase();
}

export function dedupeSkills(skills: CareerSkill[]): CareerSkill[] {
  const seen = new Set<string>();
  const out: CareerSkill[] = [];
  for (const skill of skills) {
    const canonical = resolveCanonicalSkillName(skill.name);
    const key = canonical.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      ...skill,
      name: canonical,
      category: skill.category ?? toCareerSkill(canonical).category,
    });
  }
  return out;
}

/** Extract known skills from free text (deterministic, alias-aware). */
export function extractKnownSkills(text: string): CareerSkill[] {
  const haystack = normalizeLower(text);
  if (!haystack) return [];

  const matchedSpans: Array<{ start: number; end: number; name: string }> = [];

  for (const { pattern, canonical } of SKILL_DETECTION_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
    let match: RegExpExecArray | null;
    while ((match = re.exec(haystack)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      const overlaps = matchedSpans.some((s) => start < s.end && end > s.start);
      if (!overlaps) matchedSpans.push({ start, end, name: canonical });
    }
  }

  const singleTokenAliases = Object.keys(KNOWN_SKILL_ALIASES).sort((a, b) => b.length - a.length);
  for (const alias of singleTokenAliases) {
    if (alias.includes(" ")) continue;
    let idx = 0;
    while ((idx = haystack.indexOf(alias, idx)) !== -1) {
      const end = idx + alias.length;
      const overlaps = matchedSpans.some((s) => idx < s.end && end > s.start);
      if (!overlaps) {
        matchedSpans.push({ start: idx, end, name: KNOWN_SKILL_ALIASES[alias]! });
      }
      idx = end;
    }
  }

  const found = matchedSpans.map((span) => toCareerSkill(span.name));
  return dedupeSkills(found);
}

export function collectTextParts(parts: Array<string | undefined>): string {
  return parts.map((p) => normalizeText(p)).filter(Boolean).join("\n");
}

export function groupSkillsByCategory(skills: CareerSkill[]): Record<string, CareerSkill[]> {
  const groups: Record<string, CareerSkill[]> = {};
  for (const skill of skills) {
    const category = skill.category ?? "other";
    if (!groups[category]) groups[category] = [];
    groups[category]!.push(skill);
  }
  return groups;
}
