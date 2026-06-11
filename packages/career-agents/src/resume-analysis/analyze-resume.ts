import {
  collectTextParts,
  dedupeSkills,
  extractKnownSkills,
  normalizeText,
  resolveCanonicalSkillName,
  toCareerSkill,
} from "../shared/normalize.js";
import type { CareerSkill } from "../shared/types.js";
import type { ResumeAnalysisInput, ResumeAnalysisOutput, SkillEvidenceLevel } from "./types.js";

function mergeExplicitSkills(explicit: string[] | undefined, extracted: CareerSkill[]): CareerSkill[] {
  const fromList = (explicit ?? [])
    .map((s) => normalizeText(s))
    .filter(Boolean)
    .map((name) => toCareerSkill(resolveCanonicalSkillName(name), false));

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

function textContainsSkill(text: string, skillName: string): boolean {
  const found = extractKnownSkills(text).map((s) => s.name.toLowerCase());
  return found.includes(skillName.toLowerCase());
}

function buildSkillEvidence(
  input: ResumeAnalysisInput,
  normalizedSkills: CareerSkill[],
): Record<string, SkillEvidenceLevel> {
  const evidence: Record<string, SkillEvidenceLevel> = {};
  const explicitSkills = new Set(
    (input.skills ?? []).map((s) => resolveCanonicalSkillName(s).toLowerCase()),
  );
  const summaryText = normalizeText(input.summary);
  const experienceCorpus = (input.experiences ?? [])
    .flatMap((e) => [e.title, e.company, e.description])
    .join("\n");
  const projectCorpus = (input.projects ?? [])
    .flatMap((p) => [p.name, p.description, ...(p.stack ?? [])])
    .join("\n");

  for (const skill of normalizedSkills) {
    const key = skill.name.toLowerCase();
    const inExperience = textContainsSkill(experienceCorpus, skill.name);
    const inProject = textContainsSkill(projectCorpus, skill.name);
    const inSummaryOnly =
      !inExperience && !inProject && summaryText && textContainsSkill(summaryText, skill.name);
    const onlyListed = explicitSkills.has(key) && !inExperience && !inProject && !inSummaryOnly;

    if (inExperience || inProject) {
      evidence[key] = "strong";
    } else if (inSummaryOnly || onlyListed) {
      evidence[key] = onlyListed ? "listed" : "weak";
    } else {
      evidence[key] = "weak";
    }
  }

  return evidence;
}

function buildStrongestEvidence(
  input: ResumeAnalysisInput,
  skillEvidence: Record<string, SkillEvidenceLevel>,
): string[] {
  const strong: string[] = [];

  for (const exp of input.experiences ?? []) {
    const title = normalizeText(exp.title);
    const company = normalizeText(exp.company);
    const desc = normalizeText(exp.description);
    const label = company ? `${title} @ ${company}` : title;
    const expSkills = extractKnownSkills(collectTextParts([title, desc])).map((s) => s.name);

    if (expSkills.length > 0) {
      strong.push(`Experience "${label}" demonstrates: ${expSkills.join(", ")}`);
    } else if (desc.length >= 80) {
      strong.push(`${label}: ${desc.slice(0, 160)}${desc.length > 160 ? "…" : ""}`);
    }

    if (/\b(lead|staff|principal|s[eê]nior|senior)\b/i.test(title)) {
      strong.push(`Seniority signal from title: ${title}`);
    }
  }

  for (const project of input.projects ?? []) {
    const stack = (project.stack ?? []).map((s) => resolveCanonicalSkillName(s));
    if (stack.length > 0) {
      strong.push(`Project "${project.name}" explicit stack: ${stack.join(", ")}`);
    } else if (normalizeText(project.description)) {
      const projectSkills = extractKnownSkills(project.description ?? "").map((s) => s.name);
      if (projectSkills.length > 0) {
        strong.push(`Project "${project.name}" mentions: ${projectSkills.join(", ")}`);
      }
    }
  }

  const listedOnly = Object.entries(skillEvidence)
    .filter(([, level]) => level === "strong")
    .map(([name]) => name);
  if (listedOnly.length === 0 && strong.length === 0) {
    return strong;
  }

  return [...new Set(strong)];
}

function buildWeakEvidence(
  input: ResumeAnalysisInput,
  normalizedSkills: CareerSkill[],
  skillEvidence: Record<string, SkillEvidenceLevel>,
): string[] {
  const weak: string[] = [];

  for (const skill of normalizedSkills) {
    const level = skillEvidence[skill.name.toLowerCase()];
    if (level === "listed") {
      weak.push(`${skill.name} listed in skills without project or experience context`);
    } else if (level === "weak") {
      weak.push(`${skill.name} mentioned only in summary or without concrete context`);
    }
  }

  const summary = normalizeText(input.summary);
  if (summary && summary.length < 60) {
    weak.push("Summary is generic or too short for measurable outcomes");
  } else if (summary && !/\d|%|increase|reduce|improve|deliver|ship/i.test(summary)) {
    weak.push("Summary lacks measurable outcomes or impact metrics");
  }

  for (const exp of input.experiences ?? []) {
    const title = normalizeText(exp.title);
    const company = normalizeText(exp.company);
    const desc = normalizeText(exp.description);
    const label = company ? `${title} @ ${company}` : title;

    if (desc && desc.length < 80) weak.push(`${label}: short description (${desc.length} chars)`);
    else if (!desc) weak.push(`${label}: no description`);
  }

  return [...new Set(weak)];
}

function buildMissingEvidence(
  input: ResumeAnalysisInput,
  normalizedSkills: CareerSkill[],
  skillEvidence: Record<string, SkillEvidenceLevel>,
): string[] {
  const missing: string[] = [];

  if (!normalizeText(input.summary)) missing.push("Professional summary");
  if (!(input.experiences?.length ?? 0)) missing.push("Work experience entries");
  if (!(input.projects?.length ?? 0)) missing.push("Project highlights");

  for (const skill of normalizedSkills) {
    const level = skillEvidence[skill.name.toLowerCase()];
    if (level === "listed" || level === "weak") {
      missing.push(`No strong evidence for skill: ${skill.name}`);
    }
  }

  return [...new Set(missing)];
}

function buildPortfolioOpportunities(
  normalizedSkills: CareerSkill[],
  skillEvidence: Record<string, SkillEvidenceLevel>,
  projects: ResumeAnalysisInput["projects"],
): string[] {
  const hasProject = (projects?.length ?? 0) > 0;
  const opportunities: string[] = [];

  for (const skill of normalizedSkills) {
    const level = skillEvidence[skill.name.toLowerCase()];
    if (level === "listed" || level === "weak") {
      opportunities.push(`Add a project demonstrating ${skill.name} with stack and measurable outcomes.`);
    }
  }

  const skillNames = normalizedSkills.map((s) => s.name.toLowerCase());
  if (skillNames.some((s) => s.includes("react") || s.includes("next"))) {
    opportunities.push("Add a public React/Next.js project demonstrating component architecture.");
  }
  if (skillNames.some((s) => s.includes("node") || s.includes("express") || s.includes("api"))) {
    opportunities.push("Document an API project with auth, validation, and tests.");
  }
  if (!hasProject) opportunities.push("Include at least one named project with stack and outcomes.");

  return [...new Set(opportunities)];
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
  const skillEvidence = buildSkillEvidence(input, normalizedSkills);

  const senioritySignals = senioritySignalsFromExperiences(input.experiences);

  return {
    normalizedSkills,
    senioritySignals,
    skillEvidence,
    strongestEvidence: buildStrongestEvidence(input, skillEvidence),
    weakEvidence: buildWeakEvidence(input, normalizedSkills, skillEvidence),
    missingEvidence: buildMissingEvidence(input, normalizedSkills, skillEvidence),
    portfolioOpportunities: buildPortfolioOpportunities(normalizedSkills, skillEvidence, input.projects),
  };
}
