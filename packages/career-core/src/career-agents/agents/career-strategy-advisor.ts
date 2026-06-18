import type { CareerApplication } from "../../schemas/careerApplication.js";
import type {
  CareerAgentContext,
  CareerAgentFinding,
  CareerAgentRecommendation,
  CareerStrategyPlan,
  CareerStrategyPriorityRole,
  CareerStrategySkillPriority,
} from "../types.js";

/**
 * Deterministic career strategy planning. Derived only from the sanitized CareerBundle,
 * selected signals, and client-safe analysis input. Never promises hiring, never
 * recommends auto-apply, never invents experience, and limits focus to at most three
 * primary fronts. Human review is always required.
 */

const MAX_FRONTS = 3;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function collectRequiredSkills(applications: readonly CareerApplication[]): string[] {
  const skills = new Set<string>();
  for (const application of applications) {
    for (const skill of application.requiredSkills) {
      const normalized = normalize(skill);
      if (normalized) skills.add(normalized);
    }
  }
  return [...skills].sort((left, right) => left.localeCompare(right));
}

function readinessFor(coverage: number): CareerStrategyPriorityRole["readiness"] {
  if (coverage >= 0.75) return "ready";
  if (coverage >= 0.4) return "near_ready";
  return "longer_term";
}

export type CareerStrategyAdvisorOutput = {
  summary: string;
  findings: CareerAgentFinding[];
  recommendations: CareerAgentRecommendation[];
  evidence: string[];
  careerStrategyPlan: CareerStrategyPlan;
};

export function runCareerStrategyAdvisor(context: CareerAgentContext): CareerStrategyAdvisorOutput {
  const bundle = context.careerBundle;
  const applications = bundle.applications;
  const mainStack = (bundle.candidate?.mainStack ?? []).map(normalize).filter(Boolean);
  const mainStackSet = new Set(mainStack);

  const requiredSkills = collectRequiredSkills(applications);
  const matchedSkills = requiredSkills.filter((skill) => mainStackSet.has(skill));
  const missingSkills = requiredSkills.filter((skill) => !mainStackSet.has(skill));
  const overallCoverage = requiredSkills.length === 0 ? 0.5 : matchedSkills.length / requiredSkills.length;

  const availability = context.analysisInput.availability;
  const constraints = context.analysisInput.constraints ?? [];

  const candidateTargets = context.analysisInput.targetRoles?.length
    ? context.analysisInput.targetRoles
    : bundle.candidate?.targetRole
      ? [bundle.candidate.targetRole]
      : [...new Set(applications.map((application) => application.role))];

  const priorityRoles: CareerStrategyPriorityRole[] = candidateTargets
    .slice(0, MAX_FRONTS)
    .map((role) => {
      const roleTokens = new Set(normalize(role).split(/\s+/).filter(Boolean));
      const relatedApps = applications.filter((application) =>
        normalize(application.role)
          .split(/\s+/)
          .some((token) => roleTokens.has(token)),
      );
      const relatedRequired = collectRequiredSkills(relatedApps);
      const relatedMatched = relatedRequired.filter((skill) => mainStackSet.has(skill));
      const coverage =
        relatedRequired.length === 0
          ? overallCoverage
          : relatedMatched.length / relatedRequired.length;
      return {
        role,
        rationale:
          relatedApps.length > 0
            ? `Backed by ${relatedApps.length} tracked application(s) and ${Math.round(coverage * 100)}% skill coverage.`
            : `Derived from target focus with ${Math.round(coverage * 100)}% overall skill coverage.`,
        readiness: readinessFor(coverage),
      };
    });

  const skillPriorities: CareerStrategySkillPriority[] = missingSkills.slice(0, MAX_FRONTS).map(
    (skill, index) => ({
      skill,
      priority: index === 0 ? "high" : index === 1 ? "medium" : "low",
      reason: "Required by tracked applications but not yet evidenced in the main stack.",
      evidence: applications
        .filter((application) => application.requiredSkills.map(normalize).includes(skill))
        .slice(0, 3)
        .map((application) => `${application.company}:${application.role}`),
    }),
  );

  const portfolioPriorities: string[] = skillPriorities
    .slice(0, MAX_FRONTS)
    .map((item) => `Build or document a project that evidences ${item.skill}.`);
  if (portfolioPriorities.length === 0)
    portfolioPriorities.push("Maintain a concise portfolio highlighting your strongest evidenced skills.");

  const applicationStrategy: string[] = [
    overallCoverage >= 0.6
      ? "Prioritize applications where your evidenced coverage is already strong."
      : "Focus on a small set of best-fit roles instead of broad applications.",
    "Tailor each application manually; never auto-apply.",
  ];
  if (constraints.length > 0)
    applicationStrategy.push(`Respect stated constraints: ${constraints.slice(0, 3).join("; ")}.`);

  const focusSkill = skillPriorities[0]?.skill;
  const thirtyDayPlan: string[] = [
    focusSkill
      ? `Study and practice ${focusSkill} with one small, verifiable deliverable.`
      : "Audit your strongest skills and update the resume summary accordingly.",
    "Shortlist up to three best-fit target roles.",
  ];
  const sixtyDayPlan: string[] = [
    skillPriorities[1]?.skill
      ? `Deepen ${skillPriorities[1]?.skill} and add a portfolio artifact.`
      : "Add a portfolio artifact for your top priority skill.",
    "Begin tailored applications to shortlisted roles after human review.",
  ];
  const ninetyDayPlan: string[] = [
    "Consolidate evidence from completed work into measurable resume bullets.",
    "Reassess readiness for priority roles and adjust focus.",
  ];

  const risks: string[] = [];
  if (availability)
    risks.push(`Plan assumes availability "${availability}"; adjust scope if this changes.`);
  if (overallCoverage < 0.4)
    risks.push("Current skill coverage is low; the timeline depends on consistent study.");
  if (candidateTargets.length > MAX_FRONTS)
    risks.push("Multiple targets detected; focus was limited to three to keep the plan realistic.");
  risks.push("This plan is advisory only and does not guarantee interviews or hiring.");

  const positioningSummary =
    `Positioning for ${priorityRoles.map((role) => role.role).join(", ") || "your target roles"} ` +
    `with ${Math.round(overallCoverage * 100)}% evidenced coverage across ${applications.length} application(s).`;

  const findings: CareerAgentFinding[] = [
    {
      kind: "study",
      title: "Strategy focus",
      category: "strategy",
      evidence: [
        `priority_roles:${priorityRoles.length}`,
        `skill_priorities:${skillPriorities.length}`,
        `coverage:${Math.round(overallCoverage * 100)}`,
      ],
      recommendation: "Limit active focus to the three prioritized fronts.",
      priority: "high",
    },
  ];

  const recommendations: CareerAgentRecommendation[] = skillPriorities.map((item) => ({
    title: `Prioritize ${item.skill}`,
    category: "next_steps",
    evidence: item.evidence,
    recommendation: item.reason,
    priority: item.priority,
  }));
  if (recommendations.length === 0)
    recommendations.push({
      title: "Maintain momentum",
      category: "next_steps",
      evidence: matchedSkills.slice(0, 5),
      recommendation: "Keep evidencing your strongest skills and apply selectively.",
      priority: "medium",
    });

  const careerStrategyPlan: CareerStrategyPlan = {
    positioningSummary,
    priorityRoles,
    skillPriorities,
    portfolioPriorities,
    applicationStrategy,
    thirtyDayPlan,
    sixtyDayPlan,
    ninetyDayPlan,
    risks,
    reviewRequired: true,
  };

  const summary =
    `Career strategy plan prepared with ${priorityRoles.length} priority role(s) and ` +
    `${skillPriorities.length} skill front(s); review required before acting.`;

  return {
    summary,
    findings,
    recommendations,
    evidence: [`coverage:${Math.round(overallCoverage * 100)}`, ...matchedSkills.slice(0, 10)],
    careerStrategyPlan,
  };
}
