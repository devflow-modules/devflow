import type { CareerAgentContext, CareerAgentFinding, CareerAgentRecommendation } from "../types.js";

function normalizeSkill(value: string): string {
  return value.trim().toLowerCase();
}

function collectDesiredSkills(context: CareerAgentContext): string[] {
  const desired = new Set<string>();

  for (const application of context.careerBundle.applications) {
    for (const skill of application.requiredSkills) {
      const normalized = normalizeSkill(skill);
      if (normalized) {
        desired.add(normalized);
      }
    }
  }

  return [...desired].sort((left, right) => left.localeCompare(right));
}

function collectEvidencedSkills(context: CareerAgentContext): string[] {
  const evidenced = new Set<string>();

  for (const skill of context.careerBundle.candidate?.mainStack ?? []) {
    const normalized = normalizeSkill(skill);
    if (normalized) {
      evidenced.add(normalized);
    }
  }

  for (const application of context.careerBundle.applications) {
    if (typeof application.matchScore === "number" && application.matchScore >= 70) {
      for (const skill of application.requiredSkills) {
        const normalized = normalizeSkill(skill);
        if (normalized) {
          evidenced.add(normalized);
        }
      }
    }
  }

  return [...evidenced].sort((left, right) => left.localeCompare(right));
}

export type ProfileGapAnalystOutput = {
  summary: string;
  findings: CareerAgentFinding[];
  recommendations: CareerAgentRecommendation[];
  evidence: string[];
};

export function runProfileGapAnalyst(context: CareerAgentContext): ProfileGapAnalystOutput {
  const desiredSkills = collectDesiredSkills(context);
  const evidencedSkills = collectEvidencedSkills(context);
  const evidencedSet = new Set(evidencedSkills);
  const technicalGaps = desiredSkills.filter((skill) => !evidencedSet.has(skill));

  const evidenceGaps =
    context.selectedSignals.length === 0
      ? ["no_provider_signals_selected"]
      : context.selectedSignals.map((signal) => `${signal.kind}:${signal.company ?? "unknown"}`);

  const portfolioGaps =
    context.careerBundle.applications.filter((app) => (app.matchScore ?? 0) < 60).length > 0
      ? context.careerBundle.applications
          .filter((app) => (app.matchScore ?? 0) < 60)
          .slice(0, 5)
          .map((app) => `${app.company}:${app.role}`)
      : ["no_low_match_applications"];

  const findings: CareerAgentFinding[] = [
    {
      kind: "gap",
      title: "Technical skill gaps",
      category: "technical",
      evidence: technicalGaps.slice(0, 8),
      recommendation: "Add learning or project evidence for missing technical skills.",
      priority: technicalGaps.length > 3 ? "high" : technicalGaps.length > 0 ? "medium" : "low",
    },
    {
      kind: "gap",
      title: "Evidence gaps",
      category: "evidence",
      evidence: evidenceGaps,
      recommendation: "Strengthen proof points for skills referenced in target roles.",
      priority: context.selectedSignals.length === 0 ? "medium" : "low",
    },
    {
      kind: "gap",
      title: "Portfolio gaps",
      category: "portfolio",
      evidence: portfolioGaps,
      recommendation: "Improve portfolio alignment for lower-fit applications before applying further.",
      priority: portfolioGaps[0] === "no_low_match_applications" ? "low" : "medium",
    },
  ];

  const recommendations: CareerAgentRecommendation[] = technicalGaps.slice(0, 3).map((skill, index) => ({
    title: `Learning suggestion: ${skill}`,
    category: "learning",
    evidence: [skill],
    recommendation: "Create a short study plan and one portfolio artifact for this skill.",
    priority: index === 0 ? "high" : "medium",
  }));

  return {
    summary: `Profile gap review identified ${technicalGaps.length} technical gap(s) across ${desiredSkills.length} desired skill(s).`,
    findings,
    recommendations,
    evidence: [...technicalGaps, ...evidencedSkills],
  };
}
