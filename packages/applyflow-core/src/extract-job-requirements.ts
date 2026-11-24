import { splitRequiredPreferredSkills } from "./copilot-job-match.js";
import { extractJobIntelligence, normalizeJobTextForIntel } from "./job-intelligence.js";
import type { JobRequirement, JobRequirementCategory, JobRequirementImportance } from "./job-requirement-types.js";
import { postingSeniority } from "./job-seniority.js";

const SKILL_CATEGORY: Record<string, JobRequirementCategory> = {
  react: "frontend",
  "next.js": "frontend",
  nextjs: "frontend",
  typescript: "frontend",
  javascript: "frontend",
  html: "frontend",
  css: "frontend",
  tailwind: "frontend",
  "node.js": "backend",
  nodejs: "backend",
  python: "backend",
  fastapi: "backend",
  django: "backend",
  flask: "backend",
  java: "backend",
  go: "backend",
  golang: "backend",
  rust: "backend",
  "c++": "backend",
  elixir: "backend",
  ruby: "backend",
  postgresql: "backend",
  postgres: "backend",
  prisma: "backend",
  graphql: "backend",
  rest: "backend",
  openapi: "backend",
  swagger: "backend",
  supabase: "backend",
  "supabase edge functions": "backend",
  express: "backend",
  nestjs: "backend",
  kafka: "backend",
  rabbitmq: "backend",
  mongodb: "backend",
  redis: "backend",
  docker: "core_engineering",
  kubernetes: "cloud",
  k8s: "cloud",
  aws: "cloud",
  azure: "cloud",
  gcp: "cloud",
  terraform: "cloud",
  git: "core_engineering",
  jest: "core_engineering",
  playwright: "core_engineering",
  cypress: "core_engineering",
  "ci/cd": "core_engineering",
  "github actions": "core_engineering",
  llm: "ai",
  llms: "ai",
  openai: "ai",
  embeddings: "ai",
};

const PHRASE_SPECS: {
  id: string;
  pattern: RegExp;
  label: string;
  category: JobRequirementCategory;
  requirementType: JobRequirement["requirementType"];
  skillHint?: string;
  qualifiers?: string[];
  minYears?: number;
}[] = [
  {
    id: "aws-architecture-years",
    pattern: /(\d+)\s*\+?\s*years?\s+(?:of\s+)?(?:experience\s+)?(?:architecting|architecture|designing)\s+(?:on\s+)?aws\b/i,
    label: "AWS architecture",
    category: "cloud",
    requirementType: "years",
    skillHint: "AWS",
    qualifiers: ["architecture"],
  },
  {
    id: "architecting-aws-years",
    pattern: /(\d+)\s*\+?\s*years?\s+architecting\s+aws\b/i,
    label: "AWS architecture",
    category: "cloud",
    requirementType: "years",
    skillHint: "AWS",
    qualifiers: ["architecture"],
  },
  {
    id: "python-backend-years",
    pattern: /(\d+)\s*\+?\s*years?\s+(?:of\s+)?(?:senior\s+)?python\s+backend\b/i,
    label: "Python backend",
    category: "backend",
    requirementType: "years",
    skillHint: "Python",
    qualifiers: ["backend"],
  },
  {
    id: "professional-experience-years",
    pattern: /(\d+)\s*\+?\s*years?\s+of\s+professional(?:\s+software\s+development)?\s+experience\b(?!\s+working\s+with)/i,
    label: "Professional experience",
    category: "seniority",
    requirementType: "years",
  },
  {
    id: "preferred-experience-years",
    pattern: /(\d+)\s*\+?\s*years?(?:\s+of\s+(?:professional\s+)?(?:software\s+development\s+)?experience)?\s+preferred(?:\s+but\s+not\s+required)?/i,
    label: "Preferred experience",
    category: "seniority",
    requirementType: "years",
  },
  {
    id: "shipping-software-years",
    pattern: /(\d+)\s*\+?\s*years?\s+(?:of\s+)?(?:building|shipping|developing|writing)(?:\s+(?:and|&)\s+(?:building|shipping|developing|maintaining))?\s+(?:production\s+)?software\b/i,
    label: "Professional experience",
    category: "seniority",
    requirementType: "years",
  },
  {
    id: "api-integrations",
    pattern: /\bapis?\s+(?:and|&)\s+integrations?\b|\bthird[\s-]party\s+integrations?\b|\bsdk\s+integrations?\b/i,
    label: "API integrations",
    category: "backend",
    requirementType: "experience",
    qualifiers: ["integrations"],
  },
  {
    id: "fullstack-years",
    pattern: /(\d+)\s*\+?\s*years?\s+(?:experience\s+)?(?:as\s+a\s+)?full[\s-]?stack\b/i,
    label: "Full-stack experience",
    category: "seniority",
    requirementType: "years",
  },
  {
    id: "typescript-backend",
    pattern: /\bbackend(?:\s+capabilities)?(?:\s+in)?\s+typescript\b|\btypescript\s+backend\b/i,
    label: "TypeScript on the backend",
    category: "backend",
    requirementType: "experience",
    skillHint: "TypeScript",
    qualifiers: ["backend"],
  },
  {
    id: "senior-python-backend",
    pattern: /\bsenior\s+python\s+backend\b/i,
    label: "Senior Python backend",
    category: "backend",
    requirementType: "experience",
    skillHint: "Python",
    qualifiers: ["backend", "senior"],
  },
  {
    id: "distributed-microservices",
    pattern: /\bdistributed\s+microservices\b|\bmicroservices\s+architecture\b|\bdistributed\s+systems\b/i,
    label: "Distributed microservices",
    category: "backend",
    requirementType: "experience",
    qualifiers: ["distributed", "microservices"],
  },
  {
    id: "vector-database",
    pattern: /\bvector\s+databases?\b|\bpinecone\b|\bweaviate\b|\bpgvector\b/i,
    label: "Vector database",
    category: "ai",
    requirementType: "skill",
    qualifiers: ["vector"],
  },
  {
    id: "production-llm",
    pattern: /\bproduction\s+(?:llm|genai|generative\s+ai)\b|\bllm\s+in\s+production\b|\bproduction\s+genai\b|\bproduction[-\s]?ready\s+ai\b/i,
    label: "Production LLM / GenAI system",
    category: "ai",
    requirementType: "experience",
    qualifiers: ["production", "llm"],
  },
  {
    id: "shipped-llm-features",
    pattern:
      /\bshipped\s+llm[-\s]?powered\s+features?\b|\bllm[-\s]?powered\s+features?\s+to\s+real\s+users\b|\bhands[-\s]?on\s+experience\b[^.?\n]{0,80}\bllms?\b|\bexperience\s+(?:delivering|shipping)\s+[^.?\n]{0,80}\b(?:llms?|gen(?:erative)?\s*ai|ai[-\s]?powered)\b/i,
    label: "Shipped LLM-powered features",
    category: "ai",
    requirementType: "experience",
    skillHint: "LLM",
    qualifiers: ["production", "llm", "shipped"],
  },
  {
    id: "llm-apis-embeddings",
    pattern: /\bllm\s+apis?\b|\bembeddings?\b|\bvector\s+(?:databases?|stores?)\b|\bretrieval[-\s]?augmented\b/i,
    label: "LLM APIs / embeddings / retrieval",
    category: "ai",
    requirementType: "experience",
    skillHint: "LLM",
    qualifiers: ["llm", "embeddings"],
  },
  {
    id: "ai-agents",
    pattern: /\bai\s+agents?\b|\bagentic\b|\bllm\s+agents?\b/i,
    label: "AI Agents",
    category: "ai",
    requirementType: "experience",
    qualifiers: ["agents"],
  },
  {
    id: "kafka",
    pattern: /\bkafka\b/i,
    label: "Kafka",
    category: "backend",
    requirementType: "skill",
    skillHint: "Kafka",
  },
];

const MANDATORY_CUE =
  /\b(?:required|must[- ]have|essential|non[- ]negotiable|you must|this is a must|minimum qualifications|must,?\s+not a bonus)\b/i;
const PREFERRED_CUE = /\b(?:nice to have|preferred|bonus|plus|optional)\b/i;

function lineHasMandatoryCue(line: string): boolean {
  if (PREFERRED_CUE.test(line) && !MANDATORY_CUE.test(line)) return false;
  return MANDATORY_CUE.test(line);
}

function sectionBounds(text: string, matchIndex: number): { lastRequired: number; lastPreferred: number } {
  const section = text.slice(0, matchIndex).toLowerCase();
  return {
    lastRequired: Math.max(
      section.lastIndexOf("requirements"),
      section.lastIndexOf("minimum qualifications"),
      section.lastIndexOf("what you'll need"),
      section.lastIndexOf("you must"),
    ),
    lastPreferred: Math.max(
      section.lastIndexOf("nice to have"),
      section.lastIndexOf("preferred qualifications"),
      section.lastIndexOf("\nnice to have"),
      section.lastIndexOf("\npreferred"),
      section.lastIndexOf("\nbonus"),
    ),
  };
}

function contextIsPreferred(text: string, matchIndex: number): boolean {
  const { lastRequired, lastPreferred } = sectionBounds(text, matchIndex);
  return lastPreferred >= 0 && lastPreferred > lastRequired;
}

function contextMakesMandatory(text: string, matchIndex: number, matchLength: number): boolean {
  if (contextIsPreferred(text, matchIndex)) return false;
  const start = Math.max(0, matchIndex - 160);
  const end = Math.min(text.length, matchIndex + matchLength + 160);
  const window = text.slice(start, end);
  if (/\bthis is a must\b|\bmust,?\s+not a bonus\b|\bmust have\b|\bessential\b|\bnon[- ]negotiable\b/i.test(window)) {
    return true;
  }
  const lineStart = text.lastIndexOf("\n", matchIndex) + 1;
  const lineEnd = text.indexOf("\n", matchIndex);
  const line = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);
  if (lineHasMandatoryCue(line)) return true;
  // Do not infer mandatory solely from "Requirements" section membership.
  return false;
}

function contextInRequiredSection(text: string, matchIndex: number): boolean {
  if (contextIsPreferred(text, matchIndex)) return false;
  const { lastRequired, lastPreferred } = sectionBounds(text, matchIndex);
  return lastRequired >= 0 && lastRequired > lastPreferred;
}

const SYSTEMS_LANG_ALT =
  /(\d+)\s*\+?\s*years?\s+(?:of\s+)?(?:professional\s+)?(?:software\s+)?(?:development\s+)?(?:experience\s+)?(?:with|in|using|working with)?\s*([^\n.]{0,120}?(?:golang|\bgo\b|c\+\+|rust)[^\n.]{0,80}?(?:golang|\bgo\b|c\+\+|rust)[^\n.]{0,80}?(?:golang|\bgo\b|c\+\+|rust))/i;

const SYSTEMS_LANG_TOKEN = /golang|\bgo\b|c\+\+|rust/gi;

function normalizeSystemsLang(raw: string): string {
  const folded = normalizeJobTextForIntel(raw.replace(/^\b|\b$/g, ""));
  if (folded.includes("golang") || folded === "go") return "Go";
  if (folded.includes("c++")) return "C++";
  if (folded.includes("rust")) return "Rust";
  return raw;
}

function extractSystemsLanguageAlternatives(
  text: string,
): { minYears: number; alternatives: string[]; extractedText: string } | undefined {
  const match = SYSTEMS_LANG_ALT.exec(text);
  if (!match) return undefined;
  const years = Number(match[1]);
  if (!Number.isFinite(years)) return undefined;
  const alts = [
    ...new Set(
      [...(match[2] ?? "").matchAll(SYSTEMS_LANG_TOKEN)].map((item) => normalizeSystemsLang(item[0] ?? "")),
    ),
  ].filter(Boolean);
  if (alts.length < 2) return undefined;
  return { minYears: years, alternatives: alts, extractedText: match[0].trim() };
}

function slugId(prefix: string, label: string, index: number): string {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36);
  return `${prefix}-${slug || "req"}-${index}`;
}

function importanceFor(skill: string, split: { preferred: readonly string[]; knockout: readonly string[] }): JobRequirementImportance {
  if (split.preferred.some((item) => item.toLowerCase() === skill.toLowerCase())) return "nice_to_have";
  if (split.knockout.some((item) => item.toLowerCase() === skill.toLowerCase())) return "fundamental";
  return "important";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function yearsNear(text: string, token: string): number | undefined {
  const folded = normalizeJobTextForIntel(text);
  const needle = escapeRegExp(normalizeJobTextForIntel(token));
  const patterns = [
    new RegExp(`(\\d+)\\s*\\+?\\s*years?\\s+(?:of\\s+)?(?:professional\\s+)?experience\\s+(?:working\\s+with|with|in|using)\\s+${needle}\\b`),
    new RegExp(`(\\d+)\\s*\\+?\\s*years?\\s+(?:of\\s+)?(?:experience\\s+(?:with|in)\\s+)?${needle}\\b`),
    new RegExp(`${needle}\\s*[(,]\\s*(\\d+)\\s*\\+?\\s*years?`),
    new RegExp(`${needle}\\s+(\\d+)\\s*\\+?\\s*years?`),
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(folded);
    if (!match) continue;
    const years = Number(match[1]);
    if (Number.isFinite(years)) return years;
  }
  return undefined;
}

function qualifiersNear(text: string, token: string): string[] {
  const folded = normalizeJobTextForIntel(text);
  const needle = escapeRegExp(normalizeJobTextForIntel(token));
  const found: string[] = [];
  if (new RegExp(`\\b${needle}\\s+architect|\\barchitect(?:ing|ure)?\\s+(?:on\\s+)?${needle}\\b`).test(folded)) {
    found.push("architecture");
  }
  if (new RegExp(`\\bproduction\\s+${needle}\\b|\\b${needle}\\s+in production\\b`).test(folded)) {
    found.push("production");
  }
  if (new RegExp(`\\bdistributed\\s+${needle}\\b|\\b${needle}\\s+distributed\\b`).test(folded)) {
    found.push("distributed");
  }
  if (new RegExp(`\\b${needle}\\s+microservices?\\b|\\bmicroservices?\\s+${needle}\\b`).test(folded)) {
    found.push("microservices");
  }
  if (new RegExp(`\\bbackend(?:\\s+capabilities)?(?:\\s+in)?\\s+${needle}\\b|\\b${needle}\\s+backend\\b`).test(folded)) {
    found.push("backend");
  }
  if (new RegExp(`\\bsenior\\s+${needle}\\b`).test(folded)) found.push("senior");
  return found;
}

function categoryForSkill(label: string): JobRequirementCategory {
  const key = normalizeJobTextForIntel(label);
  return SKILL_CATEGORY[key] ?? "other";
}

function canonicalSkillHint(raw: string, detected: readonly string[]): string {
  const folded = normalizeJobTextForIntel(raw);
  const hit = detected.find((item) => normalizeJobTextForIntel(item) === folded);
  if (hit) return hit;
  if (folded === "react") return "React";
  if (folded === "next.js" || folded === "nextjs") return "Next.js";
  return raw;
}

const WORKING_WITH_YEARS =
  /(\d+)\s*\+?\s*years?\s+(?:of\s+)?(?:professional\s+)?experience\s+(?:working\s+with|with|in|using)\s+([A-Za-z][\w+#]*(?:\.[A-Za-z][\w+#]*)*)/gi;

function extractWorkingWithSkillYears(text: string): { years: number; skill: string; extractedText: string }[] {
  const found: { years: number; skill: string; extractedText: string }[] = [];
  for (const match of text.matchAll(WORKING_WITH_YEARS)) {
    const years = Number(match[1]);
    const skill = match[2]?.replace(/[.,;:]+$/g, "");
    if (!Number.isFinite(years) || !skill) continue;
    found.push({ years, skill, extractedText: match[0].replace(/[.,;:]+$/g, "").trim() });
  }
  return found;
}

function extractRequiredDegree(text: string): { label: string; extractedText: string; qualifiers: string[] } | undefined {
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || /\bor equivalent\b/i.test(line)) continue;
    const fourYear = line.match(/\b((?:a\s+)?(?:four|4)[-\s]?year\s+college\s+degree)\s+is\s+required\b/i);
    if (fourYear) {
      return {
        label: "Four-year college degree",
        extractedText: fourYear[0].trim(),
        qualifiers: ["education", "degree", "four-year"],
      };
    }
    const bachelor = line.match(/\b((?:bachelor(?:['’]s)?|college)\s+degree)\s+is\s+required\b/i);
    if (bachelor) {
      return {
        label: "College degree",
        extractedText: bachelor[0].trim(),
        qualifiers: ["education", "degree"],
      };
    }
  }
  return undefined;
}

/**
 * Builds structured requirements from posting text.
 * "3+ years architecting AWS" stays as AWS + 3 years + architecture — not skill=AWS alone.
 */
export function extractJobRequirements(jobText: string, options: { title?: string } = {}): JobRequirement[] {
  const text = jobText.trim();
  const folded = normalizeJobTextForIntel(text);
  const intel = extractJobIntelligence(text);
  const split = splitRequiredPreferredSkills(text, intel.detectedSkills);
  const out: JobRequirement[] = [];
  const claimed = new Set<string>();

  const remember = (key: string): boolean => {
    if (claimed.has(key)) return false;
    claimed.add(key);
    return true;
  };

  const systemsLang = extractSystemsLanguageAlternatives(text);
  if (systemsLang && remember("systems-lang-alternatives")) {
    const at = text.indexOf(systemsLang.extractedText);
    const mandatory =
      contextMakesMandatory(text, at, systemsLang.extractedText.length) ||
      contextInRequiredSection(text, at);
    out.push({
      id: "req-systems-lang-alt",
      label: `${systemsLang.alternatives.join(" / ")} (${systemsLang.minYears}+ years)`,
      category: "backend",
      importance: mandatory ? "fundamental" : "important",
      requirementType: "years",
      extractedText: systemsLang.extractedText,
      minYears: systemsLang.minYears,
      alternatives: systemsLang.alternatives,
      skillHint: systemsLang.alternatives[0],
      mandatory,
    });
    for (const alt of systemsLang.alternatives) {
      const names = alt === "Go" ? [alt, "Golang"] : [alt];
      for (const name of names) {
        claimed.add(`skill:${normalizeJobTextForIntel(name)}`);
        claimed.add(`skill-years:${normalizeJobTextForIntel(name)}`);
      }
    }
  }

  for (const item of extractWorkingWithSkillYears(text)) {
    const skillKey = `skill-years:${normalizeJobTextForIntel(item.skill)}`;
    if (!remember(skillKey)) continue;
    const skillHint = canonicalSkillHint(item.skill, intel.detectedSkills);
    const preferred = split.preferred.some((entry) => normalizeJobTextForIntel(entry) === normalizeJobTextForIntel(skillHint));
    const mandatory =
      !preferred && contextMakesMandatory(text, text.indexOf(item.extractedText), item.extractedText.length);
    out.push({
      id: slugId("phrase", `${skillHint} experience`, out.length),
      label: `${skillHint} (${item.years}+ years)`,
      category: categoryForSkill(skillHint),
      importance: preferred ? "nice_to_have" : mandatory ? "fundamental" : "important",
      requirementType: "years",
      extractedText: item.extractedText,
      minYears: item.years,
      skillHint,
      mandatory,
    });
  }

  PHRASE_SPECS.forEach((spec, index) => {
    spec.pattern.lastIndex = 0;
    const match = spec.pattern.exec(text);
    if (!match) return;
    const yearsFromPhrase = match[1] && /^\d+$/.test(match[1]) ? Number(match[1]) : undefined;
    const minYears = yearsFromPhrase ?? spec.minYears ?? yearsNear(text, spec.skillHint ?? spec.label);
    if (!remember(spec.id)) return;
    const inPreferred = spec.id === "preferred-experience-years" ||
      (spec.skillHint
        ? split.preferred.some((item) => normalizeJobTextForIntel(item) === normalizeJobTextForIntel(spec.skillHint ?? ""))
        : false);
    const matchIndex = match.index ?? 0;
    const preferredBySection = contextIsPreferred(text, matchIndex);
    const treatedPreferred = inPreferred || preferredBySection || spec.id === "preferred-experience-years";
    const cueMandatory = !treatedPreferred && contextMakesMandatory(text, matchIndex, match[0].length);
    const aiCentral =
      !treatedPreferred &&
      spec.category === "ai" &&
      (Boolean(spec.qualifiers?.includes("shipped")) ||
        Boolean(spec.qualifiers?.includes("production")) ||
        (Boolean(spec.qualifiers?.includes("llm")) && !spec.qualifiers?.includes("agents")) ||
        (Boolean(spec.qualifiers?.includes("agents")) && cueMandatory) ||
        (Boolean(spec.qualifiers?.includes("embeddings")) && contextInRequiredSection(text, matchIndex))) &&
      (cueMandatory ||
        contextInRequiredSection(text, matchIndex) ||
        Boolean(spec.qualifiers?.includes("shipped")));
    const mandatory =
      !treatedPreferred &&
      (Boolean(spec.qualifiers?.includes("senior") && spec.category === "backend") || cueMandatory || aiCentral);
    const importance: JobRequirementImportance = treatedPreferred
      ? "nice_to_have"
      : mandatory || spec.qualifiers?.includes("architecture") || spec.qualifiers?.includes("backend")
        ? "fundamental"
        : "important";
    out.push({
      id: slugId("phrase", spec.label, index),
      label: minYears ? `${spec.label} (${minYears}+ years)` : spec.label,
      category: spec.category,
      importance,
      requirementType: spec.requirementType,
      extractedText: match[0].trim(),
      ...(minYears ? { minYears } : {}),
      ...(spec.qualifiers ? { qualifiers: spec.qualifiers } : {}),
      ...(spec.skillHint ? { skillHint: spec.skillHint } : {}),
      mandatory,
    });
    // The contextual AI requirement already covers the bare LLM/Embeddings token; avoid a duplicate generic skill.
    if (spec.category === "ai" && (spec.skillHint === "LLM" || spec.qualifiers?.includes("llm"))) {
      claimed.add("skill:llm");
      claimed.add("skill:embeddings");
    }
  });

  const degree = extractRequiredDegree(text);
  if (degree && remember("required-degree")) {
    out.push({
      id: "req-education",
      label: degree.label,
      category: "other",
      importance: "fundamental",
      requirementType: "other",
      extractedText: degree.extractedText,
      qualifiers: degree.qualifiers,
      mandatory: true,
    });
  }

  for (const skill of intel.detectedSkills) {
    const key = `skill:${normalizeJobTextForIntel(skill)}`;
    if (skill.toLowerCase() === "aws" && claimed.has("aws-architecture-years")) continue;
    if (skill.toLowerCase() === "python" && (claimed.has("python-backend-years") || claimed.has("senior-python-backend"))) {
      continue;
    }
    if (!remember(key)) continue;
    const minYears = claimed.has(`skill-years:${normalizeJobTextForIntel(skill)}`) ? undefined : yearsNear(text, skill);
    let qualifiers = qualifiersNear(text, skill);
    if (normalizeJobTextForIntel(skill) === "typescript" && claimed.has("typescript-backend")) {
      qualifiers = qualifiers.filter((item) => item !== "backend");
    }
    if (normalizeJobTextForIntel(skill) === "supabase") {
      if (/\bdatabase\b|\bpostgres\b|\bpostgresql\b/i.test(folded)) qualifiers.push("database");
      if (/\bauth\b/i.test(folded)) qualifiers.push("auth");
      if (/\bstorage\b/i.test(folded)) qualifiers.push("storage");
      qualifiers = [...new Set(qualifiers)];
    }
    const preferred = split.preferred.includes(skill);
    const required = split.required.includes(skill);
    const knockout = split.knockout.includes(skill);
    out.push({
      id: slugId("skill", skill, out.length),
      label: minYears ? `${skill} (${minYears}+ years)` : skill,
      category: categoryForSkill(skill),
      importance: preferred ? "nice_to_have" : required ? importanceFor(skill, split) : "important",
      requirementType: minYears ? "years" : "skill",
      extractedText: skill,
      ...(minYears ? { minYears } : {}),
      ...(qualifiers.length ? { qualifiers } : {}),
      skillHint: skill,
      mandatory: knockout && !preferred,
    });
  }

  if (options.title?.trim()) {
    const posted = postingSeniority({ title: options.title, text });
    if (posted.level !== "unknown") {
      const elevated = posted.level !== "junior" && posted.level !== "mid" && posted.level !== "senior";
      out.push({
        id: "req-seniority",
        label: `Seniority: ${[posted.level, ...posted.alternatives].join(" or ")}`,
        category: "seniority",
        importance: posted.level === "junior" || posted.level === "mid" ? "important" : "fundamental",
        requirementType: "experience",
        extractedText: posted.extractedText ?? posted.level,
        qualifiers: [posted.level, ...posted.alternatives, `source:${posted.source}`],
        mandatory: elevated,
      });
    }
  } else if (intel.seniority !== "unknown") {
    out.push({
      id: "req-seniority",
      label: `Seniority: ${intel.seniority}`,
      category: "seniority",
      importance: intel.seniority === "lead" || intel.seniority === "senior" ? "fundamental" : "important",
      requirementType: "experience",
      extractedText: intel.seniority,
      qualifiers: [intel.seniority],
      mandatory: intel.seniority === "lead",
    });
  }

  if (intel.englishRequired) {
    const bar = intel.englishBar;
    const qualifiers = [
      ...(bar === "fluent" || bar === "advanced" || bar === "professional" ? [bar] : []),
      ...(/\bspoken\b/.test(intel.englishExtractedText ?? text) ? ["spoken"] : []),
    ];
    out.push({
      id: "req-english",
      label: bar === "fluent" ? "Fluent English" : bar === "advanced" ? "Advanced English" : "English",
      category: "language",
      importance: "fundamental",
      requirementType: "language",
      extractedText: intel.englishExtractedText ?? "english",
      skillHint: "English",
      ...(qualifiers.length ? { qualifiers } : {}),
      mandatory: true,
    });
  }

  if (intel.mentionedLocations.length > 0) {
    out.push({
      id: "req-location",
      label: intel.workModel === "remote"
        ? `Remote locations: ${intel.mentionedLocations.join(", ")}`
        : `Locations: ${intel.mentionedLocations.join(", ")}`,
      category: "other",
      importance: "important",
      requirementType: "location",
      extractedText: intel.mentionedLocations.join(", "),
      qualifiers: intel.mentionedLocations.map((item) => item.toLowerCase()),
    });
  }

  if (intel.schedule) {
    out.push({
      id: "req-schedule",
      label: `Online presence ${intel.schedule.extractedText}`,
      category: "other",
      importance: "fundamental",
      requirementType: "schedule",
      extractedText: intel.schedule.extractedText,
      qualifiers: [
        ...(intel.schedule.timezoneLabel ? [intel.schedule.timezoneLabel.toLowerCase()] : []),
        ...(intel.schedule.dstAmbiguous ? ["dst_ambiguous"] : []),
      ],
      mandatory: false,
    });
  }

  if (intel.workModel !== "unknown") {
    out.push({
      id: "req-work-model",
      label: `Work model: ${intel.workModel}`,
      category: "other",
      importance: intel.workModel === "onsite" ? "fundamental" : "important",
      requirementType: "work_model",
      extractedText: intel.workModel,
      mandatory: intel.workModel === "onsite",
    });
  }

  if (intel.salaryMentioned) {
    const periodicity = intel.compensation?.periodicity ?? "unknown";
    out.push({
      id: "req-salary",
      label: intel.compensation
        ? `Compensation ${intel.compensation.extractedText}`
        : "Salary mentioned",
      category: "other",
      importance: "nice_to_have",
      requirementType: "salary",
      extractedText: intel.compensation?.extractedText,
      qualifiers: [periodicity === "unknown" ? "periodicity_unknown" : periodicity],
    });
  }

  if (/\bproduct engineer\b|\bownership\b|\b0\s*[-to]{1,3}\s*1\b|\bdiscovery\b/i.test(text)) {
    if (remember("product-engineer")) {
      out.push({
        id: "req-product-engineer",
        label: "Product engineering / ownership",
        category: "product",
        importance: "important",
        requirementType: "experience",
        extractedText: "product engineer",
        qualifiers: ["product", "ownership"],
      });
    }
  }

  return out;
}
