import {
  collectTextParts,
  dedupeSkills,
  extractKnownSkills,
  groupSkillsByCategory,
  normalizeText,
} from "../shared/normalize.js";
import type { CareerSeniority } from "../shared/types.js";
import type { JobAnalysisInput, JobAnalysisOutput } from "./types.js";

const DOMAIN_SIGNALS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /\bsaas\b|\bb2b\s*saas\b/i, label: "SaaS" },
  { pattern: /\bcrm\b/i, label: "CRM" },
  { pattern: /\bfintech\b/i, label: "fintech" },
  { pattern: /\bhealth(?:care|tech)?\b|\bsa[uú]de\b/i, label: "health" },
  { pattern: /\bsales\b|\bvendas\b/i, label: "sales" },
  { pattern: /\bautomation\b|\bautoma[cç][aã]o\b/i, label: "automation" },
  { pattern: /\b(?:\bai\b|artificial\s*intelligence|machine\s*learning|llm)\b/i, label: "AI" },
  { pattern: /\be-?commerce\b/i, label: "e-commerce" },
  { pattern: /\bedtech\b/i, label: "edtech" },
  { pattern: /\bmarketplace\b/i, label: "marketplace" },
];

const RISK_FLAG_RULES: ReadonlyArray<{ pattern: RegExp; flag: string }> = [
  { pattern: /\bpj\s*obrigat[oó]ri[oa]\b|\bonly\s*pj\b/i, flag: "pj_obrigatorio" },
  { pattern: /\bdisponibilidade\s*imediata\b|\bimmediate\s*availability\b/i, flag: "disponibilidade_imediata" },
  { pattern: /\bplant[aã]o\b|\bon[- ]call\b/i, flag: "plantao" },
  { pattern: /\bpresencial\b|\bon[- ]site\b|\b100%\s*office\b/i, flag: "presencial" },
  { pattern: /\bingl[eê]s\s*fluente\b|\bfluent\s*english\b/i, flag: "ingles_fluente" },
  { pattern: /\brockstar\b|\bninja\b|\b10x\b/i, flag: "hype_language" },
];

const REQUIRED_SECTION =
  /\b(?:requirements|requisitos|must\s+have|obrigat[oó]ri[oa]s?|qualifica[cç][oõ]es\s+obrigat[oó]rias)\b/i;
const NICE_SECTION =
  /\b(?:nice\s+to\s+have|diferenciais?|plus|desej[aá]ve[lis]?|diferencial)\b/i;

function inferSeniority(text: string): { level: CareerSeniority; evidence: string[] } {
  const evidence: string[] = [];
  const rules: Array<{ re: RegExp; level: CareerSeniority; label: string }> = [
    { re: /\b(est[aá]gio|intern\b)/i, level: "intern", label: "intern/stage keyword" },
    { re: /\b(j[uú]nior|junior|jr\.?)\b/i, level: "junior", label: "junior keyword" },
    { re: /\b(pleno|mid[- ]level|mid\b)/i, level: "mid", label: "mid/pleno keyword" },
    { re: /\b(s[eê]nior|senior|sr\.?)\b/i, level: "senior", label: "senior keyword" },
    { re: /\b(lead|staff|principal|architect)\b/i, level: "lead", label: "lead/staff keyword" },
  ];

  for (const rule of rules) {
    const match = text.match(rule.re);
    if (match) {
      evidence.push(`${rule.label}: "${match[0]}"`);
      return { level: rule.level, evidence };
    }
  }

  return { level: "unknown", evidence: ["No explicit seniority keywords found"] };
}

function findSectionIndex(text: string, pattern: RegExp): number {
  const match = text.match(pattern);
  return match?.index ?? -1;
}

function splitRequiredAndNice(description: string, skills: ReturnType<typeof extractKnownSkills>) {
  const lower = description.toLowerCase();
  const niceIdx = findSectionIndex(lower, NICE_SECTION);
  const requiredIdx = findSectionIndex(lower, REQUIRED_SECTION);

  if (niceIdx === -1 && requiredIdx === -1) {
    return { required: skills.map((s) => ({ ...s, required: true })), nice: [] as typeof skills };
  }

  let requiredText = description;
  let niceText = "";

  if (requiredIdx !== -1 && niceIdx !== -1) {
    requiredText = description.slice(requiredIdx, niceIdx);
    niceText = description.slice(niceIdx);
  } else if (niceIdx !== -1) {
    requiredText = description.slice(0, niceIdx);
    niceText = description.slice(niceIdx);
  } else if (requiredIdx !== -1) {
    requiredText = description.slice(requiredIdx);
  }

  const requiredNames = new Set(extractKnownSkills(requiredText).map((s) => s.name.toLowerCase()));
  const niceNames = new Set(extractKnownSkills(niceText).map((s) => s.name.toLowerCase()));

  const required = skills
    .filter((s) => requiredNames.has(s.name.toLowerCase()) || !niceNames.has(s.name.toLowerCase()))
    .map((s) => ({ ...s, required: true }));
  const nice = skills
    .filter((s) => niceNames.has(s.name.toLowerCase()) && !requiredNames.has(s.name.toLowerCase()))
    .map((s) => ({ ...s, required: false }));

  return { required: dedupeSkills(required), nice: dedupeSkills(nice) };
}

function detectDomainSignals(text: string): string[] {
  const out: string[] = [];
  for (const { pattern, label } of DOMAIN_SIGNALS) {
    if (pattern.test(text)) out.push(label);
  }
  return [...new Set(out)];
}

function detectRiskFlags(
  title: string,
  description: string,
  skills: ReturnType<typeof extractKnownSkills>,
): string[] {
  const corpus = `${title} ${description}`;
  const flags: string[] = [];

  if (description.trim().length < 120) flags.push("short_description");
  if (!title.trim()) flags.push("missing_title");

  for (const { pattern, flag } of RISK_FLAG_RULES) {
    if (pattern.test(corpus)) flags.push(flag);
  }

  const categories = new Set(skills.map((s) => s.category ?? "other"));
  if (skills.length > 10 && categories.size >= 4) {
    flags.push("muitos_requisitos_desconexos");
  }

  return [...new Set(flags)];
}

function buildInterviewTopics(skills: string[], seniority: CareerSeniority): string[] {
  const topics = new Set<string>();
  topics.add("Motivation and role fit");
  if (seniority === "senior" || seniority === "lead") topics.add("System design and trade-offs");
  if (skills.some((s) => /react|next/i.test(s))) topics.add("Frontend architecture and React patterns");
  if (skills.some((s) => /node|express|api|graphql/i.test(s))) topics.add("Backend API design");
  if (skills.some((s) => /postgres|prisma|sql/i.test(s))) topics.add("Data modeling and persistence");
  if (skills.some((s) => /playwright|jest/i.test(s))) topics.add("Testing strategy");
  return [...topics];
}

export function analyzeJob(input: JobAnalysisInput): JobAnalysisOutput {
  const normalizedTitle = normalizeText(input.title) || "Unknown role";
  const description = normalizeText(input.description);
  const corpus = collectTextParts([input.title, input.company, description]);

  const { level: seniority, evidence: seniorityEvidence } = inferSeniority(corpus);
  const allSkills = extractKnownSkills(corpus);
  const { required, nice } = splitRequiredAndNice(description, allSkills);
  const allGrouped = groupSkillsByCategory([...required, ...nice]);

  const domainSignals = detectDomainSignals(corpus);
  const riskFlags = detectRiskFlags(normalizedTitle, description, allSkills);
  const interviewTopics = buildInterviewTopics(
    allSkills.map((s) => s.name),
    seniority,
  );

  return {
    normalizedTitle,
    seniority,
    requiredSkills: required,
    niceToHaveSkills: nice,
    domainSignals,
    riskFlags,
    interviewTopics,
    skillGroups: allGrouped,
    seniorityEvidence,
    requirementsDensity: {
      requiredCount: required.length,
      niceToHaveCount: nice.length,
    },
  };
}
