import { collectTextParts, dedupeSkills, extractKnownSkills, normalizeText } from "../shared/normalize.js";
import type { CareerSeniority } from "../shared/types.js";
import type { JobAnalysisInput, JobAnalysisOutput } from "./types.js";

const DOMAIN_SIGNALS: Readonly<Record<string, string>> = {
  fintech: "fintech",
  "e-commerce": "e-commerce",
  ecommerce: "e-commerce",
  saas: "B2B SaaS",
  "b2b": "B2B",
  healthcare: "healthcare",
  edtech: "edtech",
  marketplace: "marketplace",
};

function inferSeniority(text: string): CareerSeniority {
  const t = text.toLowerCase();
  if (/\b(est[aá]gio|intern\b)/i.test(t)) return "intern";
  if (/\b(j[uú]nior|junior|jr\.?)\b/i.test(t)) return "junior";
  if (/\b(pleno|mid[- ]level|mid\b)\b/i.test(t)) return "mid";
  if (/\b(s[eê]nior|senior|sr\.?)\b/i.test(t)) return "senior";
  if (/\b(lead|staff|principal|architect)\b/i.test(t)) return "lead";
  return "unknown";
}

function splitRequiredAndNice(description: string, skills: ReturnType<typeof extractKnownSkills>) {
  const lower = description.toLowerCase();
  const niceSectionIdx = lower.search(/\bnice to have\b|\bdesej[aá]vel\b|\bbonus\b|\bplus\b/);

  if (niceSectionIdx === -1) {
    return { required: skills.map((s) => ({ ...s, required: true })), nice: [] as typeof skills };
  }

  const requiredText = description.slice(0, niceSectionIdx);
  const niceText = description.slice(niceSectionIdx);
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
  const lower = text.toLowerCase();
  const out: string[] = [];
  for (const [needle, label] of Object.entries(DOMAIN_SIGNALS)) {
    if (lower.includes(needle)) out.push(label);
  }
  return [...new Set(out)];
}

function detectRiskFlags(title: string, description: string, skillCount: number): string[] {
  const flags: string[] = [];
  if (description.trim().length < 120) flags.push("short_description");
  if (skillCount > 12) flags.push("broad_stack_list");
  if (!title.trim()) flags.push("missing_title");
  if (/rockstar|ninja|10x/i.test(`${title} ${description}`)) flags.push("hype_language");
  return flags;
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

  const seniority = inferSeniority(corpus);
  const allSkills = extractKnownSkills(corpus);
  const { required, nice } = splitRequiredAndNice(description, allSkills);

  const domainSignals = detectDomainSignals(corpus);
  const riskFlags = detectRiskFlags(normalizedTitle, description, allSkills.length);
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
  };
}
