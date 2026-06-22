import type { CareerChatIntent } from "@devflow/career-core";
import { isCareerPilotIntent, type CareerPilotIntent } from "./career-pilot-content";

export type CareerPilotSimpleInputs = {
  targetRole: string;
  resumeText: string;
  jobDescription: string;
  careerGoal: string;
  weeklyAvailability: string;
  constraints: string;
};

export const EMPTY_CAREER_PILOT_SIMPLE_INPUTS: CareerPilotSimpleInputs = {
  targetRole: "",
  resumeText: "",
  jobDescription: "",
  careerGoal: "",
  weeklyAvailability: "",
  constraints: "",
};

export const MAX_PILOT_RESUME_TEXT_LENGTH = 12_000;
export const MAX_PILOT_JOB_DESCRIPTION_LENGTH = 12_000;
export const MIN_PILOT_RESUME_TEXT_LENGTH = 40;
export const MIN_PILOT_JOB_DESCRIPTION_LENGTH = 20;

export function isCareerPilotIntentForValidation(
  intent: CareerChatIntent,
): intent is CareerPilotIntent {
  return isCareerPilotIntent(intent);
}
