import type { CareerSkill } from "../shared/types.js";

export type SkillEvidenceLevel = "strong" | "weak" | "listed";

export type ResumeAnalysisInput = {
  headline?: string;
  summary?: string;
  experiences?: Array<{
    title: string;
    company?: string;
    description?: string;
  }>;
  skills?: string[];
  projects?: Array<{
    name: string;
    description?: string;
    stack?: string[];
  }>;
  education?: string[];
};

export type ResumeAnalysisOutput = {
  normalizedSkills: CareerSkill[];
  senioritySignals: string[];
  strongestEvidence: string[];
  weakEvidence: string[];
  missingEvidence: string[];
  portfolioOpportunities: string[];
  skillEvidence?: Record<string, SkillEvidenceLevel>;
};
