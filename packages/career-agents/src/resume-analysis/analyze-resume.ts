import {
  collectTextParts,
  dedupeSkills,
  extractKnownSkills,
  normalizeText,
  toCareerSkill,
} from "../shared/normalize.js";
import type { CareerSkill } from "../shared/types.js";
import type { ResumeAnalysisInput, ResumeAnalysisOutput } from "./types.js";

function mergeExplicitSkills(explicit: string[] | undefined, extracted: CareerSkill[]): CareerSkill[] {
  const fromList = (explicit ?? [])
    .map((s) => normalizeText(s))
    .filter(Boolean)
    .map((name) => toCareerSkill(name, false));

  return dedupeSkills([...fromList, ...extracted]);
}

function senioritySignalsFromExperiences(experiences: ResumeAnalysisInput["experiences"]): string[] {
  const signals: string[] = [];
  for (const exp of experiences ?? []) {
    const title = normalizeText(exp.title);
    if (!title) continue;
    if (/\b(lead|staff|principal|architect)\b/i.test(title)) signals.push(`Lead-level title: ${title}`);
    else if (/\b(s[eê]nior|senior)\b/i.test(title)) signals.push(`Senior title: ${title}`);
    else if (/\b(pleno|mid)\b/i.test(title)) signals.push(`Mid-level title: ${title}`);
    else if (/\b(j[uú]nior|junior|intern|est[aá]gio)\b/i.test(title)) signals.push(`Junior/intern title: ${title}`);
  }
  return signals.length ? signals : ["No explicit seniority keywords in experience titles"];
}

function evidenceFromExperiences(experiences: ResumeAnalysisInput["experiences"]): {
  strong: string[];
  weak: string[];
} {
  const strong: string[] = [];
  const weak: string[] = [];

  for (const exp of experiences ?? []) {
    const title = normalizeText(exp.title);
    const company = normalizeText(exp.company);
    const desc = normalizeText(exp.description);
    const label = company ? `${title} @ ${company}` : title;

    if (desc.length >= 80) strong.push(`${label}: ${desc.slice(0, 160)}${desc.length > 160 ? "…" : ""}`);
    else if (desc) weak.push(`${label}: short description (${desc.length} chars)`);
    else weak.push(`${label}: no description`);
  }

  return { strong, weak };
}

function portfolioOpportunities(skills: CareerSkill[], projects: ResumeAnalysisInput["projects"]): string[] {
  const hasProject = (projects?.length ?? 0) > 0;
  const opportunities: string[] = [];

  const skillNames = skills.map((s) => s.name.toLowerCase());
  if (skillNames.some((s) => s.includes("react") || s.includes("next"))) {
    opportunities.push("Add a public React/Next.js project demonstrating component architecture.");
  }
  if (skillNames.some((s) => s.includes("node") || s.includes("express") || s.includes("api"))) {
    opportunities.push("Document an API project with auth, validation, and tests.");
  }
  if (!hasProject) opportunities.push("Include at least one named project with stack and outcomes.");

  return opportunities;
}

export function analyzeResume(input: ResumeAnalysisInput): ResumeAnalysisOutput {
  const experienceText = (input.experiences ?? [])
    .flatMap((e) => [e.title, e.company, e.description])
    .join("\n");
  const projectText = (input.projects ?? [])
    .flatMap((p) => [p.name, p.description, ...(p.stack ?? [])])
    .join("\n");
  const educationText = (input.education ?? []).join("\n");

  const corpus = collectTextParts([
    input.headline,
    input.summary,
    experienceText,
    projectText,
    educationText,
    ...(input.skills ?? []),
  ]);

  const extracted = extractKnownSkills(corpus);
  const normalizedSkills = mergeExplicitSkills(input.skills, extracted);

  const senioritySignals = senioritySignalsFromExperiences(input.experiences);
  const { strong, weak } = evidenceFromExperiences(input.experiences);

  const missingEvidence: string[] = [];
  if (!normalizeText(input.summary)) missingEvidence.push("Professional summary");
  if (!(input.experiences?.length ?? 0)) missingEvidence.push("Work experience entries");
  if (!(input.projects?.length ?? 0)) missingEvidence.push("Project highlights");

  return {
    normalizedSkills,
    senioritySignals,
    strongestEvidence: strong,
    weakEvidence: weak,
    missingEvidence,
    portfolioOpportunities: portfolioOpportunities(normalizedSkills, input.projects),
  };
}
