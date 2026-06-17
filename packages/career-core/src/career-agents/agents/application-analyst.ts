import type { CareerApplication } from "../../schemas/careerApplication.js";
import type {
  CareerAgentContext,
  CareerAgentFinding,
  CareerAgentRecommendation,
  CareerAgentStructuredItem,
} from "../types.js";

function normalizeSkill(value: string): string {
  return value.trim().toLowerCase();
}

function collectRequiredSkills(applications: readonly CareerApplication[]): string[] {
  const skills = new Set<string>();
  for (const application of applications) {
    for (const skill of application.requiredSkills) {
      const normalized = normalizeSkill(skill);
      if (normalized) {
        skills.add(normalized);
      }
    }
  }

  return [...skills].sort((left, right) => left.localeCompare(right));
}

function collectEvidencedSkills(context: CareerAgentContext): string[] {
  const fromCandidate = context.careerBundle.candidate?.mainStack ?? [];
  const merged = new Set(fromCandidate.map(normalizeSkill).filter(Boolean));
  return [...merged].sort((left, right) => left.localeCompare(right));
}

function computeMatchedSkills(required: string[], evidenced: string[]): string[] {
  const evidencedSet = new Set(evidenced);
  return required.filter((skill) => evidencedSet.has(skill));
}

function computeMissingSkills(required: string[], evidenced: string[]): string[] {
  const evidencedSet = new Set(evidenced);
  return required.filter((skill) => !evidencedSet.has(skill));
}

function fitPriority(matched: number, required: number): "high" | "medium" | "low" {
  if (required === 0) {
    return "medium";
  }

  const ratio = matched / required;
  if (ratio >= 0.75) {
    return "high";
  }

  if (ratio >= 0.4) {
    return "medium";
  }

  return "low";
}

function buildSignalEvidence(context: CareerAgentContext): string[] {
  return context.selectedSignals.map(
    (signal) => `${signal.source}:${signal.kind}@${signal.occurredAt}`,
  );
}

export type ApplicationAnalystOutput = {
  summary: string;
  findings: CareerAgentFinding[];
  recommendations: CareerAgentRecommendation[];
  evidence: string[];
};

export function runApplicationAnalyst(context: CareerAgentContext): ApplicationAnalystOutput {
  const applications = context.careerBundle.applications;
  const requiredSkills = collectRequiredSkills(applications);
  const evidencedSkills = collectEvidencedSkills(context);
  const matchedSkills = computeMatchedSkills(requiredSkills, evidencedSkills);
  const missingSkills = computeMissingSkills(requiredSkills, evidencedSkills);
  const signalEvidence = buildSignalEvidence(context);

  const fitFinding: CareerAgentFinding = {
    kind: "fit",
    title: "Application fit summary",
    category: "fit",
    evidence: [
      `matched_skills:${matchedSkills.length}`,
      `required_skills:${requiredSkills.length}`,
      `applications:${applications.length}`,
    ],
    recommendation:
      missingSkills.length === 0
        ? "Current evidence covers the required skills in scope."
        : "Review missing skills before prioritizing new applications.",
    priority: fitPriority(matchedSkills.length, requiredSkills.length),
  };

  const gapFinding: CareerAgentFinding | null =
    missingSkills.length > 0
      ? {
          kind: "gap",
          title: "Skill gaps detected",
          category: "skills",
          evidence: missingSkills.slice(0, 8),
          recommendation: "Collect stronger evidence for the missing skills listed.",
          priority: "high",
        }
      : null;

  const evidenceFinding: CareerAgentFinding = {
    kind: "evidence",
    title: "Selected provider signals",
    category: "signals",
    evidence: signalEvidence.length > 0 ? signalEvidence : ["no_selected_signals"],
    recommendation: "Use selected signals only as review hints, not confirmed status.",
    priority: signalEvidence.length > 0 ? "medium" : "low",
  };

  const questionFinding: CareerAgentFinding = {
    kind: "question",
    title: "Pending review questions",
    category: "review",
    evidence: applications.slice(0, 3).map((app) => `${app.company}:${app.role}`),
    recommendation: "Confirm whether each open application still matches your target profile.",
    priority: "medium",
  };

  const recommendations: CareerAgentStructuredItem[] = [
    {
      title: "Prioritize high-fit applications",
      category: "next_steps",
      evidence: matchedSkills.slice(0, 5),
      recommendation: "Focus manual review on applications with the strongest skill overlap.",
      priority: fitFinding.priority,
    },
  ];

  if (missingSkills.length > 0) {
    recommendations.push({
      title: "Close skill evidence gaps",
      category: "next_steps",
      evidence: missingSkills.slice(0, 5),
      recommendation: "Prepare examples or portfolio evidence for missing skills before interviews.",
      priority: "high",
    });
  }

  const summary =
    missingSkills.length === 0
      ? `Fit review completed for ${applications.length} application(s) with ${matchedSkills.length} matched skill(s).`
      : `Fit review completed for ${applications.length} application(s) with ${missingSkills.length} missing skill(s).`;

  return {
    summary,
    findings: [fitFinding, ...(gapFinding ? [gapFinding] : []), evidenceFinding, questionFinding],
    recommendations,
    evidence: [...matchedSkills, ...signalEvidence],
  };
}
