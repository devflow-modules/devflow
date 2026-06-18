import type {
  AtsAnalysis,
  AtsRequirementCoverage,
  CareerAgentContext,
  CareerAgentFinding,
  CareerAgentRecommendation,
  CareerJobSnapshot,
  CareerResumeSnapshot,
} from "../types.js";

/**
 * Deterministic ATS compatibility analysis. The compatibility score is computed by a
 * documented, bounded (0..100) rubric over token overlap between the sanitized resume
 * snapshot and the job snapshot. No LLM is used to compute the score; an LLM may only
 * explain results that are already computed here.
 */

const STOPWORDS = new Set([
  "and",
  "or",
  "the",
  "a",
  "an",
  "of",
  "to",
  "in",
  "on",
  "for",
  "with",
  "is",
  "are",
  "be",
  "as",
  "at",
  "by",
  "from",
  "that",
  "this",
  "you",
  "your",
  "we",
  "our",
  "will",
  "experience",
  "years",
  "year",
  "strong",
  "ability",
  "knowledge",
  "skills",
  "skill",
  "work",
  "working",
  "team",
  "plus",
]);

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function tokenize(value: string): string[] {
  return normalize(value)
    .split(/[^a-z0-9+#.]+/)
    .map((token) => token.replace(/^[.]+|[.]+$/g, ""))
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token));
}

function significantTokens(value: string): string[] {
  const seen = new Set<string>();
  for (const token of tokenize(value)) {
    if (token.length >= 3 || token.includes("+") || token.includes("#")) {
      seen.add(token);
    }
  }
  return [...seen];
}

function resumeText(resume: CareerResumeSnapshot): string {
  const parts: string[] = [];
  if (resume.summary) parts.push(resume.summary);
  parts.push(resume.skills.join(" "));
  for (const experience of resume.experiences) {
    parts.push(experience.title, experience.company, experience.bullets.join(" "));
  }
  for (const project of resume.projects ?? []) {
    parts.push(project.name, project.bullets.join(" "));
  }
  parts.push((resume.education ?? []).join(" "));
  return parts.join(" ");
}

function tokenFrequency(tokens: string[]): Map<string, number> {
  const frequency = new Map<string, number>();
  for (const token of tokens) {
    frequency.set(token, (frequency.get(token) ?? 0) + 1);
  }
  return frequency;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export type AtsAnalystOutput = {
  summary: string;
  findings: CareerAgentFinding[];
  recommendations: CareerAgentRecommendation[];
  evidence: string[];
  atsAnalysis: AtsAnalysis;
};

export function runAtsAnalyst(context: CareerAgentContext): AtsAnalystOutput {
  const resume: CareerResumeSnapshot = context.analysisInput.resumeSnapshot ?? {
    skills: [],
    experiences: [],
  };
  const job: CareerJobSnapshot = context.analysisInput.jobSnapshot ?? {
    title: context.analysisInput.targetRole ?? "target role",
    requiredRequirements: [],
  };

  const resumeTokens = tokenize(resumeText(resume));
  const resumeTokenSet = new Set(resumeTokens);
  const resumeFrequency = tokenFrequency(resumeTokens);

  const keywords = [...new Set((job.keywords ?? []).map(normalize).filter(Boolean))];
  const matchedKeywords = keywords.filter((keyword) =>
    tokenize(keyword).every((token) => resumeTokenSet.has(token)),
  );
  const missingKeywords = keywords.filter((keyword) => !matchedKeywords.includes(keyword));

  const requiredRequirementCoverage: AtsRequirementCoverage[] = job.requiredRequirements.map(
    (requirement) => {
      const tokens = significantTokens(requirement);
      const matched = tokens.filter((token) => resumeTokenSet.has(token));
      const ratio = tokens.length === 0 ? 0 : matched.length / tokens.length;
      const status: AtsRequirementCoverage["status"] =
        ratio >= 0.6 ? "covered" : ratio >= 0.3 ? "partial" : "missing";
      return { requirement, status, evidence: matched };
    },
  );

  const coveredScoreFor = (status: AtsRequirementCoverage["status"]): number =>
    status === "covered" ? 1 : status === "partial" ? 0.5 : 0;
  const requiredScore =
    requiredRequirementCoverage.length === 0
      ? keywords.length === 0
        ? 0.5
        : matchedKeywords.length / keywords.length
      : requiredRequirementCoverage.reduce((sum, item) => sum + coveredScoreFor(item.status), 0) /
        requiredRequirementCoverage.length;

  const keywordScore = keywords.length === 0 ? requiredScore : matchedKeywords.length / keywords.length;

  const hasSummary = Boolean(resume.summary && resume.summary.trim().length > 0);
  const hasSkills = resume.skills.length > 0;
  const hasExperience = resume.experiences.length > 0;
  const structurePresent = [hasSummary, hasSkills, hasExperience].filter(Boolean).length;
  const structureScore = structurePresent / 3;

  const compatibilityScore = clampScore(
    (requiredScore * 0.7 + keywordScore * 0.2 + structureScore * 0.1) * 100,
  );

  const parsingRisks: string[] = [];
  if (!hasSkills) parsingRisks.push("No skills section detected; ATS keyword matching is weakened.");
  for (const experience of resume.experiences) {
    if (!experience.title.trim()) parsingRisks.push("An experience entry is missing a job title.");
    if (experience.bullets.length === 0)
      parsingRisks.push(`No bullets under ${experience.company || "an experience"} to parse.`);
  }

  const structureRisks: string[] = [];
  if (!hasSummary) structureRisks.push("Missing a summary heading expected by many ATS templates.");
  if (!hasExperience) structureRisks.push("Missing an experience section.");
  if (!hasSkills) structureRisks.push("Missing a skills section.");

  const STUFFING_THRESHOLD = 6;
  const keywordStuffingWarnings: string[] = [];
  for (const keyword of keywords) {
    const tokens = tokenize(keyword);
    const minFrequency = tokens.reduce(
      (min, token) => Math.min(min, resumeFrequency.get(token) ?? 0),
      Number.POSITIVE_INFINITY,
    );
    if (Number.isFinite(minFrequency) && minFrequency > STUFFING_THRESHOLD) {
      keywordStuffingWarnings.push(
        `"${keyword}" appears ${minFrequency} times; excessive repetition is not counted as added coverage.`,
      );
    }
  }

  const recommendations: string[] = [];
  if (missingKeywords.length > 0)
    recommendations.push(
      `Add genuine evidence for missing keywords where true: ${missingKeywords.slice(0, 8).join(", ")}.`,
    );
  const missingRequired = requiredRequirementCoverage.filter((item) => item.status === "missing");
  if (missingRequired.length > 0)
    recommendations.push(
      `Address ${missingRequired.length} uncovered required requirement(s) with real evidence.`,
    );
  if (structureRisks.length > 0)
    recommendations.push("Add the missing standard headings to improve ATS parsing.");
  if (recommendations.length === 0)
    recommendations.push("Resume aligns well; keep claims factual and avoid keyword stuffing.");

  const findings: CareerAgentFinding[] = [
    {
      kind: "fit",
      title: "ATS compatibility score",
      category: "ats",
      evidence: [
        `compatibility_score:${compatibilityScore}`,
        `required:${requiredRequirementCoverage.length}`,
        `covered:${requiredRequirementCoverage.filter((item) => item.status === "covered").length}`,
        `matched_keywords:${matchedKeywords.length}/${keywords.length}`,
      ],
      recommendation:
        compatibilityScore >= 70
          ? "Compatibility is strong; refine missing items only."
          : "Improve required coverage and keyword evidence before applying.",
      priority: compatibilityScore >= 70 ? "medium" : "high",
    },
  ];
  if (missingRequired.length > 0) {
    findings.push({
      kind: "gap",
      title: "Uncovered required requirements",
      category: "requirements",
      evidence: missingRequired.slice(0, 8).map((item) => item.requirement),
      recommendation: "Provide verifiable evidence for these required requirements.",
      priority: "high",
    });
  }

  const careerRecommendations: CareerAgentRecommendation[] = [
    {
      title: "Close ATS gaps with factual evidence",
      category: "next_steps",
      evidence: missingKeywords.slice(0, 5),
      recommendation: "Only add keywords that reflect genuine experience; never stuff keywords.",
      priority: missingKeywords.length > 0 || missingRequired.length > 0 ? "high" : "low",
    },
  ];

  const summary =
    `ATS review for "${job.title}" scored ${compatibilityScore}/100 ` +
    `(${matchedKeywords.length}/${keywords.length} keywords matched, ` +
    `${requiredRequirementCoverage.filter((item) => item.status === "covered").length}/${requiredRequirementCoverage.length} required covered).`;

  const atsAnalysis: AtsAnalysis = {
    compatibilityScore,
    matchedKeywords,
    missingKeywords,
    requiredRequirementCoverage,
    parsingRisks,
    structureRisks,
    keywordStuffingWarnings,
    recommendations,
    reviewRequired: true,
  };

  return {
    summary,
    findings,
    recommendations: careerRecommendations,
    evidence: [`compatibility_score:${compatibilityScore}`, ...matchedKeywords.slice(0, 10)],
    atsAnalysis,
  };
}
