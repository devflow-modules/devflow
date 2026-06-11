import type { CareerSkill } from "./types.js";

/** Canonical skill tokens detected in job/resume text (lowercase keys). */
export const KNOWN_SKILL_ALIASES: Readonly<Record<string, string>> = {
  react: "React",
  "next.js": "Next.js",
  nextjs: "Next.js",
  typescript: "TypeScript",
  javascript: "JavaScript",
  "node.js": "Node.js",
  nodejs: "Node.js",
  express: "Express",
  prisma: "Prisma",
  postgresql: "PostgreSQL",
  postgres: "PostgreSQL",
  sqlite: "SQLite",
  jest: "Jest",
  playwright: "Playwright",
  tailwind: "Tailwind CSS",
  "tailwind css": "Tailwind CSS",
  "chakra ui": "Chakra UI",
  "framer motion": "Framer Motion",
  docker: "Docker",
  "github actions": "GitHub Actions",
  openai: "OpenAI",
  api: "API",
  rest: "REST",
  graphql: "GraphQL",
  jwt: "JWT",
  oauth: "OAuth",
};

const SKILL_CATEGORY_MAP: Readonly<Record<string, CareerSkill["category"]>> = {
  React: "frontend",
  "Next.js": "frontend",
  TypeScript: "frontend",
  JavaScript: "frontend",
  "Tailwind CSS": "frontend",
  "Chakra UI": "frontend",
  "Framer Motion": "frontend",
  "Node.js": "backend",
  Express: "backend",
  Prisma: "backend",
  PostgreSQL: "database",
  SQLite: "database",
  Jest: "testing",
  Playwright: "testing",
  Docker: "devops",
  "GitHub Actions": "devops",
  OpenAI: "ai",
  API: "backend",
  REST: "backend",
  GraphQL: "backend",
  JWT: "backend",
  OAuth: "backend",
};

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
    const key = skill.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(skill);
  }
  return out;
}

export function toCareerSkill(name: string, required = true): CareerSkill {
  return {
    name,
    category: SKILL_CATEGORY_MAP[name] ?? "other",
    required,
  };
}

/** Extract known skills from free text (deterministic, alias-aware). */
export function extractKnownSkills(text: string): CareerSkill[] {
  const haystack = normalizeLower(text);
  if (!haystack) return [];

  const found: CareerSkill[] = [];
  const matchedSpans: Array<{ start: number; end: number; name: string }> = [];

  const aliases = Object.keys(KNOWN_SKILL_ALIASES).sort((a, b) => b.length - a.length);
  for (const alias of aliases) {
    let idx = 0;
    while ((idx = haystack.indexOf(alias, idx)) !== -1) {
      const end = idx + alias.length;
      const overlaps = matchedSpans.some((s) => idx < s.end && end > s.start);
      if (!overlaps) {
        const canonical = KNOWN_SKILL_ALIASES[alias]!;
        matchedSpans.push({ start: idx, end, name: canonical });
      }
      idx = end;
    }
  }

  for (const span of matchedSpans) {
    found.push(toCareerSkill(span.name));
  }

  return dedupeSkills(found);
}

export function collectTextParts(parts: Array<string | undefined>): string {
  return parts.map((p) => normalizeText(p)).filter(Boolean).join("\n");
}
