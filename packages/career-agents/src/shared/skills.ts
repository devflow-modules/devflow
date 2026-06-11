import type { CareerSkill, SkillCategory } from "./types.js";

/** Canonical display names keyed by normalized alias (single-token lookups). */
export const KNOWN_SKILL_ALIASES: Readonly<Record<string, string>> = {
  react: "React",
  "next.js": "Next.js",
  nextjs: "Next.js",
  "next js": "Next.js",
  typescript: "TypeScript",
  ts: "TypeScript",
  javascript: "JavaScript",
  js: "JavaScript",
  "node.js": "Node.js",
  nodejs: "Node.js",
  node: "Node.js",
  "node js": "Node.js",
  express: "Express",
  prisma: "Prisma",
  postgresql: "PostgreSQL",
  postgres: "PostgreSQL",
  sqlite: "SQLite",
  jest: "Jest",
  playwright: "Playwright",
  tailwind: "Tailwind CSS",
  tailwindcss: "Tailwind CSS",
  "tailwind css": "Tailwind CSS",
  chakra: "Chakra UI",
  "chakra ui": "Chakra UI",
  framer: "Framer Motion",
  "framer motion": "Framer Motion",
  docker: "Docker",
  "github actions": "GitHub Actions",
  "gh actions": "GitHub Actions",
  openai: "OpenAI",
  api: "API",
  rest: "REST",
  "rest api": "REST",
  "apis rest": "REST",
  graphql: "GraphQL",
  "graphql api": "GraphQL",
  jwt: "JWT",
  "jwt auth": "JWT",
  oauth: "OAuth",
  oauth2: "OAuth",
  saas: "SaaS",
  analytics: "Analytics",
  dashboard: "Dashboard",
  liderança: "Liderança",
  lideranca: "Liderança",
  comunicação: "Comunicação",
  comunicacao: "Comunicação",
  ownership: "Ownership",
};

/** Regex patterns for multi-token / ambiguous aliases (longer patterns win via span dedupe). */
export const SKILL_DETECTION_PATTERNS: ReadonlyArray<{ pattern: RegExp; canonical: string }> = [
  { pattern: /\b(?:next\s*js|nextjs|next\.js)\b/gi, canonical: "Next.js" },
  { pattern: /\b(?:node\s*js|nodejs|node\.js)\b/gi, canonical: "Node.js" },
  { pattern: /\b(?:tailwind\s*css|tailwindcss)\b/gi, canonical: "Tailwind CSS" },
  { pattern: /\b(?:chakra\s*ui)\b/gi, canonical: "Chakra UI" },
  { pattern: /\b(?:framer\s*motion)\b/gi, canonical: "Framer Motion" },
  { pattern: /\b(?:github\s*actions|gh\s*actions)\b/gi, canonical: "GitHub Actions" },
  { pattern: /\b(?:apis?\s*rest|rest\s*api)\b/gi, canonical: "REST" },
  { pattern: /\b(?:graphql\s*api)\b/gi, canonical: "GraphQL" },
  { pattern: /\b(?:jwt\s*auth)\b/gi, canonical: "JWT" },
  { pattern: /\b(?:oauth2)\b/gi, canonical: "OAuth" },
  { pattern: /\btypescript\b/gi, canonical: "TypeScript" },
  { pattern: /\bjavascript\b/gi, canonical: "JavaScript" },
  { pattern: /\bpostgres(?:ql)?\b/gi, canonical: "PostgreSQL" },
  { pattern: /\breact\b/gi, canonical: "React" },
  { pattern: /\bexpress\b/gi, canonical: "Express" },
  { pattern: /\bprisma\b/gi, canonical: "Prisma" },
  { pattern: /\bsqlite\b/gi, canonical: "SQLite" },
  { pattern: /\bjest\b/gi, canonical: "Jest" },
  { pattern: /\bplaywright\b/gi, canonical: "Playwright" },
  { pattern: /\bdocker\b/gi, canonical: "Docker" },
  { pattern: /\bopenai\b/gi, canonical: "OpenAI" },
  { pattern: /\bgraphql\b/gi, canonical: "GraphQL" },
  { pattern: /\brest\b/gi, canonical: "REST" },
  { pattern: /\bapi\b/gi, canonical: "API" },
  { pattern: /\bjwt\b/gi, canonical: "JWT" },
  { pattern: /\boauth\b/gi, canonical: "OAuth" },
  { pattern: /\bsaas\b/gi, canonical: "SaaS" },
  { pattern: /\banalytics\b/gi, canonical: "Analytics" },
  { pattern: /\bdashboard\b/gi, canonical: "Dashboard" },
  { pattern: /\blideran[cç]a\b/gi, canonical: "Liderança" },
  { pattern: /\bcomunica[cç][aã]o\b/gi, canonical: "Comunicação" },
  { pattern: /\bownership\b/gi, canonical: "Ownership" },
  { pattern: /\btailwind\b/gi, canonical: "Tailwind CSS" },
  { pattern: /\bchakra\b/gi, canonical: "Chakra UI" },
  { pattern: /\bframer\b/gi, canonical: "Framer Motion" },
  { pattern: /\bnode\b/gi, canonical: "Node.js" },
  { pattern: /\bts\b/gi, canonical: "TypeScript" },
  { pattern: /\bjs\b/gi, canonical: "JavaScript" },
];

export const SKILL_CATEGORY_MAP: Readonly<Record<string, SkillCategory>> = {
  React: "frontend",
  "Next.js": "frontend",
  TypeScript: "frontend",
  JavaScript: "frontend",
  "Tailwind CSS": "frontend",
  "Chakra UI": "frontend",
  "Framer Motion": "frontend",
  "Node.js": "backend",
  Express: "backend",
  API: "backend",
  REST: "backend",
  GraphQL: "backend",
  JWT: "backend",
  OAuth: "backend",
  Prisma: "database",
  PostgreSQL: "database",
  SQLite: "database",
  Jest: "testing",
  Playwright: "testing",
  Docker: "devops",
  "GitHub Actions": "devops",
  OpenAI: "ai",
  SaaS: "product",
  Analytics: "product",
  Dashboard: "product",
  Liderança: "soft-skill",
  Comunicação: "soft-skill",
  Ownership: "soft-skill",
};

export function toCareerSkill(name: string, required = true): CareerSkill {
  return {
    name,
    category: SKILL_CATEGORY_MAP[name] ?? "other",
    required,
  };
}

export function resolveCanonicalSkillName(raw: string): string {
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized) return raw.trim();

  const direct = KNOWN_SKILL_ALIASES[normalized];
  if (direct) return direct;

  for (const { pattern, canonical } of SKILL_DETECTION_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(normalized)) return canonical;
  }

  return raw.trim();
}
