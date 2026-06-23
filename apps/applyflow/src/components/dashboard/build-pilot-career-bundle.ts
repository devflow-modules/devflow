import { createCareerBundle, type CareerBundle } from "@devflow/career-core";
import type { CareerSpecialistFields } from "./career-chat-workspace";
import {
  normalizeJobDescription,
  normalizeResumeText,
} from "./career-pilot-input-normalizer";
import {
  MIN_PILOT_JOB_DESCRIPTION_LENGTH,
  MIN_PILOT_RESUME_TEXT_LENGTH,
  type CareerPilotSimpleInputs,
} from "./career-pilot-simple-inputs";
import type { CareerPilotIntent } from "./career-pilot-content";

function toLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function toCommaList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Builds a session-scoped analysis context from pilot form inputs.
 * Does not persist data — used only for the in-flight chat request.
 */
export function buildPilotCareerBundleFromFields(fields: CareerSpecialistFields): CareerBundle {
  const skills = toCommaList(fields.resumeSkills);
  const targetRoles = toCommaList(fields.targetRoles);
  const role = targetRoles[0] ?? "Análise de carreira";

  return createCareerBundle(
    [
      {
        id: "pilot-session",
        company: "—",
        role,
        source: "manual",
        requiredSkills: skills.length > 0 ? skills : ["—"],
        status: "applied",
        jobDescription: toLines(fields.jobRequirements).join("\n") || undefined,
      },
    ],
    {
      mainStack: skills,
      targetRole: role,
    },
  );
}

export function hasPilotAnalysisInputs(
  action: "analyze_resume" | "analyze_ats_compatibility" | "plan_career_strategy",
  fields: CareerSpecialistFields,
): boolean {
  if (action === "plan_career_strategy") {
    return fields.targetRoles.trim().length > 0;
  }

  const hasResume =
    fields.resumeBullets.trim().length > 0 || fields.resumeSkills.trim().length > 0;

  if (action === "analyze_ats_compatibility") {
    return hasResume && fields.jobRequirements.trim().length > 0;
  }

  return hasResume;
}

export function canSubmitResumeAnalysis(
  action: CareerPilotIntent,
  simpleInputs: CareerPilotSimpleInputs,
  fields: CareerSpecialistFields,
): boolean {
  if (action === "plan_career_strategy") {
    return simpleInputs.careerGoal.trim().length > 0;
  }

  const resumeText = normalizeResumeText(simpleInputs.resumeText);
  if (resumeText.length < MIN_PILOT_RESUME_TEXT_LENGTH) {
    return false;
  }

  if (action === "analyze_ats_compatibility") {
    const jobDescription = normalizeJobDescription(simpleInputs.jobDescription);
    if (jobDescription.length < MIN_PILOT_JOB_DESCRIPTION_LENGTH) {
      return false;
    }
  }

  return hasPilotAnalysisInputs(action, fields);
}
