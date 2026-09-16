import { splitRequiredPreferredSkills } from "./copilot-job-match.js";
import { extractJobIntelligence, normalizeJobTextForIntel } from "./job-intelligence.js";
import type { JobRequirement, JobRequirementCategory, JobRequirementImportance } from "./job-requirement-types.js";

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
    pattern: /\bproduction\s+(?:llm|genai|generative\s+ai)\b|\bllm\s+in\s+production\b|\bproduction\s+genai\b/i,
    label: "Production LLM / GenAI system",
    category: "ai",
    requirementType: "experience",
    qualifiers: ["production", "llm"],
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
export function extractJobRequirements(jobText: string): JobRequirement[] {
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

  for (const item of extractWorkingWithSkillYears(text)) {
    const skillKey = `skill-years:${normalizeJobTextForIntel(item.skill)}`;
    if (!remember(skillKey)) continue;
    const skillHint = canonicalSkillHint(item.skill, intel.detectedSkills);
    const preferred = split.preferred.some((entry) => normalizeJobTextForIntel(entry) === normalizeJobTextForIntel(skillHint));
    out.push({
      id: slugId("phrase", `${skillHint} experience`, out.length),
      label: `${skillHint} (${item.years}+ years)`,
      category: categoryForSkill(skillHint),
      importance: preferred ? "nice_to_have" : "important",
      requirementType: "years",
      extractedText: item.extractedText,
      minYears: item.years,
      skillHint,
      mandatory: false,
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
    out.push({
      id: slugId("phrase", spec.label, index),
      label: minYears ? `${spec.label} (${minYears}+ years)` : spec.label,
      category: spec.category,
      importance: inPreferred ? "nice_to_have" : spec.qualifiers?.includes("architecture") || spec.qualifiers?.includes("backend")
        ? "fundamental"
        : "important",
      requirementType: spec.requirementType,
      extractedText: match[0].trim(),
      ...(minYears ? { minYears } : {}),
      ...(spec.qualifiers ? { qualifiers: spec.qualifiers } : {}),
      ...(spec.skillHint ? { skillHint: spec.skillHint } : {}),
      mandatory: !inPreferred && Boolean(spec.qualifiers?.includes("senior") && spec.category === "backend"),
    });
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

  if (intel.seniority !== "unknown") {
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
