import { createCareerBundle, type CareerBundle } from "@devflow/career-core";
import type { CareerSpecialistFields } from "./career-chat-workspace";

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
