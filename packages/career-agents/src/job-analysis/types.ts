import type { CareerSeniority, CareerSkill } from "../shared/types.js";

export type JobAnalysisInput = {
  title: string;
  company?: string;
  description: string;
};

export type JobAnalysisOutput = {
  normalizedTitle: string;
  seniority: CareerSeniority;
  requiredSkills: CareerSkill[];
  niceToHaveSkills: CareerSkill[];
  domainSignals: string[];
  riskFlags: string[];
  interviewTopics: string[];
};
