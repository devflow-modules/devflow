import { getInterviewReadyApplications } from "../../bundle-helpers.js";
import type {
  CareerAgentContext,
  CareerAgentFinding,
  CareerAgentRecommendation,
  CareerAgentStructuredItem,
  InterviewPreparationProposal,
} from "../types.js";
import { runProfileGapAnalyst } from "./profile-gap-analyst.js";

function interviewApplications(context: CareerAgentContext) {
  return getInterviewReadyApplications(context.careerBundle);
}

function buildStudyTopics(gapSkills: string[]): CareerAgentStructuredItem[] {
  return gapSkills.slice(0, 5).map((skill, index) => ({
    title: `Study topic: ${skill}`,
    category: "technical",
    evidence: [skill],
    recommendation: "Review fundamentals and prepare one concise example.",
    priority: index === 0 ? "high" : "medium",
  }));
}

function buildStarPrompts(roles: string[]): CareerAgentStructuredItem[] {
  return roles.slice(0, 4).map((role, index) => ({
    title: `STAR prompt for ${role}`,
    category: "behavioral",
    evidence: [role],
    recommendation: "Prepare Situation, Task, Action, and Result for a recent relevant example.",
    priority: index === 0 ? "high" : "medium",
  }));
}

function buildMockPlan(context: CareerAgentContext): CareerAgentStructuredItem[] {
  const apps = interviewApplications(context);
  const ordered = [...apps].sort((left, right) => left.company.localeCompare(right.company));

  return ordered.slice(0, 4).map((app, index) => ({
    title: `Mock interview: ${app.role}`,
    category: "mock_interview",
    evidence: [app.company, ...app.requiredSkills.slice(0, 3)],
    recommendation: "Run a timed mock session and capture follow-up study topics.",
    priority: index === 0 ? "high" : "medium",
  }));
}

export type InterviewCoachOutput = {
  summary: string;
  findings: CareerAgentFinding[];
  recommendations: CareerAgentRecommendation[];
  evidence: string[];
  interviewPreparationProposal: InterviewPreparationProposal;
};

export function runInterviewCoach(context: CareerAgentContext): InterviewCoachOutput {
  const gapOutput = runProfileGapAnalyst(context);
  const technicalGaps = gapOutput.findings.find((finding) => finding.category === "technical")?.evidence ?? [];
  const interviewApps = interviewApplications(context);
  const roles = interviewApps.map((app) => `${app.company} — ${app.role}`);

  const studyTopics = buildStudyTopics(technicalGaps);
  const starPrompts = buildStarPrompts(roles.length > 0 ? roles : ["target role"]);
  const mockInterviewPlan = buildMockPlan(context);

  const findings: CareerAgentFinding[] = [
    {
      kind: "study",
      title: "Study categories",
      category: "study",
      evidence: studyTopics.map((topic) => topic.title),
      recommendation: "Cover technical and behavioral categories before live interviews.",
      priority: "high",
    },
    {
      kind: "interview",
      title: "Mock interview plan",
      category: "interview",
      evidence: mockInterviewPlan.map((item) => item.title),
      recommendation: "Schedule mock sessions in priority order.",
      priority: mockInterviewPlan.length > 0 ? "high" : "medium",
    },
  ];

  const recommendations: CareerAgentRecommendation[] = [
    ...studyTopics,
    ...starPrompts.slice(0, 2),
    ...mockInterviewPlan.slice(0, 2),
  ];

  const interviewPreparationProposal: InterviewPreparationProposal = {
    reviewRequired: true,
    inMemory: true,
    exportable: true,
    copyable: true,
    focusAreas: roles.slice(0, 5),
    studyTopics,
    starPrompts,
    mockInterviewPlan,
  };

  return {
    summary: `Interview preparation plan prepared for ${interviewApps.length} interview-ready application(s).`,
    findings,
    recommendations,
    evidence: roles,
    interviewPreparationProposal,
  };
}
