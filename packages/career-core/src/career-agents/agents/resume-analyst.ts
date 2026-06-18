import type {
  CareerAgentContext,
  CareerAgentFinding,
  CareerAgentRecommendation,
  CareerResumeSnapshot,
  ResumeAnalysis,
  ResumeBulletRecommendation,
} from "../types.js";

/**
 * Deterministic resume analysis. No LLM is involved here: every output is derived
 * from documented heuristics over the sanitized resume snapshot. The agent never
 * invents metrics, skills, or experience and never rewrites the resume automatically.
 */

const ACTION_VERBS = new Set([
  "led",
  "built",
  "designed",
  "implemented",
  "shipped",
  "delivered",
  "migrated",
  "optimized",
  "reduced",
  "increased",
  "launched",
  "automated",
  "created",
  "developed",
  "architected",
  "improved",
  "scaled",
  "owned",
  "drove",
  "refactored",
]);

const EXAGGERATION_TERMS = [
  "expert",
  "guru",
  "ninja",
  "rockstar",
  "world-class",
  "best",
  "flawless",
  "perfect",
  "unmatched",
  "10x",
];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function hasMetric(bullet: string): boolean {
  return /\d/.test(bullet) || bullet.includes("%");
}

function startsWithActionVerb(bullet: string): boolean {
  const first = normalize(bullet).split(/\s+/)[0] ?? "";
  return ACTION_VERBS.has(first);
}

function wordCount(bullet: string): number {
  return bullet.trim().split(/\s+/).filter(Boolean).length;
}

function isVagueBullet(bullet: string): boolean {
  if (wordCount(bullet) < 6) {
    return true;
  }
  return !hasMetric(bullet) && !startsWithActionVerb(bullet);
}

function collectBullets(resume: CareerResumeSnapshot): Array<{ section: string; text: string }> {
  const bullets: Array<{ section: string; text: string }> = [];
  for (const experience of resume.experiences) {
    for (const bullet of experience.bullets) {
      bullets.push({ section: `${experience.title} @ ${experience.company}`, text: bullet });
    }
  }
  for (const project of resume.projects ?? []) {
    for (const bullet of project.bullets) {
      bullets.push({ section: `Project: ${project.name}`, text: bullet });
    }
  }
  return bullets;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export type ResumeAnalystOutput = {
  summary: string;
  findings: CareerAgentFinding[];
  recommendations: CareerAgentRecommendation[];
  evidence: string[];
  resumeAnalysis: ResumeAnalysis;
};

export function runResumeAnalyst(context: CareerAgentContext): ResumeAnalystOutput {
  const resume: CareerResumeSnapshot = context.analysisInput.resumeSnapshot ?? {
    skills: [],
    experiences: [],
  };
  const targetStack = (context.analysisInput.targetStack ?? []).map(normalize).filter(Boolean);
  const skills = resume.skills.map(normalize).filter(Boolean);
  const skillSet = new Set(skills);
  const bullets = collectBullets(resume);
  const totalBullets = bullets.length;

  const quantifiedBullets = bullets.filter((bullet) => hasMetric(bullet.text)).length;
  const vagueBullets = bullets.filter((bullet) => isVagueBullet(bullet.text));

  // Documented deterministic rubric (0..100):
  // summary 15 | skills up to 15 | quantified bullets up to 30 |
  // low vagueness up to 25 | projects 7.5 | education 7.5
  const summaryScore = resume.summary && resume.summary.trim().length > 0 ? 15 : 0;
  const skillsScore = (Math.min(skills.length, 8) / 8) * 15;
  const quantifiedRatio = totalBullets === 0 ? 0 : quantifiedBullets / totalBullets;
  const quantifiedScore = quantifiedRatio * 30;
  const vagueRatio = totalBullets === 0 ? 1 : vagueBullets.length / totalBullets;
  const clarityScore = (1 - vagueRatio) * 25;
  const projectsScore = (resume.projects?.length ?? 0) > 0 ? 7.5 : 0;
  const educationScore = (resume.education?.length ?? 0) > 0 ? 7.5 : 0;
  const score = clampScore(
    summaryScore + skillsScore + quantifiedScore + clarityScore + projectsScore + educationScore,
  );

  const strengths: string[] = [];
  if (summaryScore > 0) strengths.push("Resume includes a professional summary.");
  if (skills.length >= 5) strengths.push(`Skills section lists ${skills.length} skills.`);
  if (quantifiedBullets > 0)
    strengths.push(`${quantifiedBullets} bullet(s) include measurable outcomes.`);
  if ((resume.projects?.length ?? 0) > 0) strengths.push("Projects section is present.");
  if (strengths.length === 0) strengths.push("Resume provides a baseline structure to build on.");

  const weaknesses: string[] = [];
  if (summaryScore === 0) weaknesses.push("No professional summary is present.");
  if (skills.length < 5) weaknesses.push("Skills section is sparse (fewer than 5 skills).");
  if (totalBullets > 0 && quantifiedBullets === 0)
    weaknesses.push("No experience bullets include measurable outcomes.");
  if (vagueBullets.length > 0)
    weaknesses.push(`${vagueBullets.length} bullet(s) read as vague or low-impact.`);

  const missingStack = targetStack.filter((item) => !skillSet.has(item));
  const missingEvidence: string[] = [];
  for (const experience of resume.experiences) {
    if (experience.bullets.length === 0) {
      missingEvidence.push(`No evidence bullets for ${experience.title} @ ${experience.company}.`);
    }
  }
  for (const item of missingStack) {
    missingEvidence.push(`Target stack "${item}" is not listed in skills.`);
  }

  const bulletRecommendations: ResumeBulletRecommendation[] = vagueBullets
    .slice(0, 10)
    .map((bullet) => ({
      section: bullet.section,
      originalSummary: bullet.text.slice(0, 160),
      recommendation:
        "Rephrase to lead with a concrete action and the real, verifiable outcome you already achieved.",
      reason: hasMetric(bullet.text)
        ? "Bullet lacks a clear action verb."
        : "Bullet lacks an action verb and a measurable, factual result.",
    }));

  const sectionRecommendations: string[] = [];
  if (summaryScore === 0)
    sectionRecommendations.push("Add a concise summary aligned with the target role at the top.");
  if (skills.length < 5)
    sectionRecommendations.push("Expand the skills section with technologies you can evidence.");
  if (resume.experiences.length > 1)
    sectionRecommendations.push("Order experience by relevance to the target role, most recent first.");
  if ((resume.projects?.length ?? 0) === 0)
    sectionRecommendations.push("Consider a short projects section to evidence target skills.");

  const risks: string[] = [];
  for (const bullet of bullets) {
    const lowered = normalize(bullet.text);
    const term = EXAGGERATION_TERMS.find((candidate) => lowered.includes(candidate));
    if (term) {
      risks.push(`Possible overstatement ("${term}") in ${bullet.section}; keep claims verifiable.`);
    }
  }
  if (risks.length === 0)
    risks.push("No automatic claim is added; verify every bullet remains factual before sharing.");

  const nextActions: string[] = [
    "Review the suggested bullet rewrites and keep only factual changes.",
    "Confirm missing evidence items reflect real experience before adding them.",
    "Export the review payload manually after human approval.",
  ];

  const findings: CareerAgentFinding[] = [
    {
      kind: "evidence",
      title: "Resume structure overview",
      category: "structure",
      evidence: [
        `score:${score}`,
        `skills:${skills.length}`,
        `bullets:${totalBullets}`,
        `quantified_bullets:${quantifiedBullets}`,
        `vague_bullets:${vagueBullets.length}`,
      ],
      recommendation:
        weaknesses.length > 0
          ? "Address the listed weaknesses before applying to the target role."
          : "Resume structure is solid; refine bullet impact where possible.",
      priority: vagueBullets.length > 0 || quantifiedBullets === 0 ? "high" : "medium",
    },
  ];
  if (missingEvidence.length > 0) {
    findings.push({
      kind: "gap",
      title: "Missing evidence",
      category: "evidence",
      evidence: missingEvidence.slice(0, 8),
      recommendation: "Collect verifiable evidence; do not invent metrics or skills.",
      priority: "high",
    });
  }

  const recommendations: CareerAgentRecommendation[] = [
    {
      title: "Improve bullet impact",
      category: "next_steps",
      evidence: bulletRecommendations.slice(0, 5).map((item) => item.section),
      recommendation:
        "Rewrite vague bullets to lead with an action and a real outcome, preserving factuality.",
      priority: vagueBullets.length > 0 ? "high" : "low",
    },
  ];

  const summary =
    `Resume review completed with a deterministic structure score of ${score}/100 ` +
    `(${quantifiedBullets}/${totalBullets} quantified bullets, ${vagueBullets.length} vague).`;

  const resumeAnalysis: ResumeAnalysis = {
    score,
    strengths,
    weaknesses,
    missingEvidence,
    bulletRecommendations,
    sectionRecommendations,
    risks,
    nextActions,
    reviewRequired: true,
  };

  return {
    summary,
    findings,
    recommendations,
    evidence: [`resume_score:${score}`, ...skills.slice(0, 10)],
    resumeAnalysis,
  };
}
