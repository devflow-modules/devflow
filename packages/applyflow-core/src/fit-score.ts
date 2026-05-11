import { gustavoProfile } from "./candidate-profile.js";
import { APPLYFLOW_SKILL_KEYS } from "./profile-schema.js";
import type { ApplyflowSkillKey } from "./profile-schema.js";
import type { CandidateProfile } from "./profile-schema.js";
import type { Confidence, FitScoreResult } from "./types.js";

const SKILL_KEYWORDS: { key: string; patterns: RegExp[] }[] = [
  { key: "react", patterns: [/\breact\b/, /\breactjs\b/] },
  { key: "nextjs", patterns: [/\bnext\.?js\b/, /\bnextjs\b/] },
  { key: "typescript", patterns: [/\btypescript\b/, /\bts\b(?![a-z])/] },
  { key: "nodejs", patterns: [/\bnode\.?js\b/, /\bnodejs\b/, /\bnode\b/] },
  { key: "python", patterns: [/\bpython\b/] },
  { key: "postgresql", patterns: [/\bpostgres(ql)?\b/, /\bsql\b/] },
  { key: "prisma", patterns: [/\bprisma\b/] },
  { key: "docker", patterns: [/\bdocker\b/, /\bcontainer\b/] },
  { key: "jest", patterns: [/\bjest\b/] },
  { key: "playwright", patterns: [/\bplaywright\b/] },
  { key: "tailwind", patterns: [/\btailwind\b/] },
  { key: "aws", patterns: [/\baws\b/, /\bamazon web services\b/i] },
  { key: "java", patterns: [/\bjava\b/] },
  { key: "elixir", patterns: [/\belixir\b/] },
  { key: "ruby", patterns: [/\bruby\b/, /\brails\b/] },
  { key: "wordpress", patterns: [/\bwordpress\b/] },
  { key: "html", patterns: [/\bhtml\b/] },
  { key: "css", patterns: [/\bcss\b/] },
  { key: "git", patterns: [/\bgit\b/] },
  { key: "ci_cd", patterns: [/\bci\/cd\b/, /\bgithub actions\b/i, /\bgitlab ci\b/i] },
];

/** Mapeamento heurísticas da vaga → skill canónica no perfil. */
const FIT_KEY_TO_SKILL: Partial<Record<string, ApplyflowSkillKey>> = {
  react: "React",
  nextjs: "Nextjs",
  typescript: "TypeScript",
  nodejs: "Nodejs",
  python: "Python",
  postgresql: "PostgreSQL",
  prisma: "Prisma",
  docker: "Docker",
  jest: "Jest",
  playwright: "Playwright",
  tailwind: "Tailwind",
  aws: "AWS",
  java: "Java",
  elixir: "Elixir",
  ruby: "Ruby",
  wordpress: "WordPress",
  html: "HTML",
  css: "CSS",
  git: "Git",
  ci_cd: "CI_CD",
};

function normText(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/**
 * Heurística simples: percentual de skills do perfil (com anos > 0) mencionadas no texto da vaga.
 */
export function calculateFitScore(jobText: string, profile?: CandidateProfile): FitScoreResult {
  const p = profile ?? gustavoProfile;
  const text = normText(jobText);
  if (!text.trim()) {
    return { score: 0, matchedSkills: [], confidence: "low" };
  }

  const matched: string[] = [];
  for (const { key, patterns } of SKILL_KEYWORDS) {
    if (!patterns.some((re) => re.test(text))) continue;
    const sk = FIT_KEY_TO_SKILL[key];
    if (sk !== undefined) {
      if (p.skills[sk] <= 0) continue;
    }
    matched.push(key);
  }

  const total = APPLYFLOW_SKILL_KEYS.length;
  const raw = matched.length / total;
  let score = Math.round(raw * 100);
  score = Math.min(100, Math.max(0, score));

  let confidence: Confidence = "medium";
  if (jobText.length < 80) confidence = "low";
  if (matched.length >= 6) confidence = "high";

  return {
    score,
    matchedSkills: matched,
    confidence,
  };
}
