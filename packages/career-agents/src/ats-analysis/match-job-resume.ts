import { computeAtsScoreWithBreakdown } from "../shared/scoring.js";
import type { JobAnalysisOutput } from "../job-analysis/types.js";
import type { ResumeAnalysisOutput } from "../resume-analysis/types.js";
import type { AtsMatchOutput, GapSeverity } from "./types.js";

function buildGapSeverity(
  job: JobAnalysisOutput,
  resume: ResumeAnalysisOutput,
  resumeSet: Set<string>,
): AtsMatchOutput["gapSeverity"] {
  const gaps: NonNullable<AtsMatchOutput["gapSeverity"]> = [];
  const evidence = resume.skillEvidence ?? {};

  for (const skill of job.requiredSkills) {
    const key = skill.name.toLowerCase();
    if (!resumeSet.has(key)) {
      gaps.push({
        skill: skill.name,
        severity: "high",
        reason: "Required skill absent from resume",
      });
      continue;
    }

    const level = evidence[key] ?? evidence[skill.name];
    if (level !== "strong") {
      gaps.push({
        skill: skill.name,
        severity: "medium",
        reason: "Required skill present but lacks strong project or experience evidence",
      });
    }
  }

  for (const skill of job.niceToHaveSkills) {
    const key = skill.name.toLowerCase();
    if (!resumeSet.has(key)) {
      gaps.push({
        skill: skill.name,
        severity: "low",
        reason: "Nice-to-have skill not present in resume",
      });
    }
  }

  return gaps;
}

export function matchJobToResume(job: JobAnalysisOutput, resume: ResumeAnalysisOutput): AtsMatchOutput {
  const resumeSkillNames = resume.normalizedSkills.map((s) => s.name);
  const resumeSet = new Set(resumeSkillNames.map((s) => s.toLowerCase()));

  const requiredNames = job.requiredSkills.map((s) => s.name);
  const niceNames = job.niceToHaveSkills.map((s) => s.name);
  const jobSkillNames = [...requiredNames, ...niceNames];

  const matchedSkills = jobSkillNames.filter((name) => resumeSet.has(name.toLowerCase()));
  const missingSkills = requiredNames.filter((name) => !resumeSet.has(name.toLowerCase()));

  const evidenceGaps = missingSkills.map((skill) => `No resume evidence for required skill: ${skill}`);
  for (const name of matchedSkills) {
    const level = resume.skillEvidence?.[name.toLowerCase()];
    if (level && level !== "strong") {
      evidenceGaps.push(`Weak evidence for matched skill: ${name}`);
    }
  }

  const suggestedImprovements: string[] = [];
  for (const skill of missingSkills.slice(0, 5)) {
    suggestedImprovements.push(`Add a bullet demonstrating ${skill} with measurable impact.`);
  }
  if (resume.missingEvidence.includes("Project highlights")) {
    suggestedImprovements.push("Include a project section aligned with the job stack.");
  }
  if (resume.weakEvidence.length > 0) {
    suggestedImprovements.push("Expand short experience descriptions with outcomes and metrics.");
  }

  const { score, breakdown } = computeAtsScoreWithBreakdown({
    requiredJobSkills: job.requiredSkills,
    niceJobSkills: job.niceToHaveSkills,
    resumeSkillNames,
    skillEvidence: resume.skillEvidence,
  });

  const gapSeverity = buildGapSeverity(job, resume, resumeSet);

  return {
    score,
    matchedSkills: [...new Set(matchedSkills)],
    missingSkills: [...new Set(missingSkills)],
    evidenceGaps: [...new Set(evidenceGaps)],
    suggestedImprovements: [...new Set(suggestedImprovements)],
    scoreBreakdown: breakdown,
    gapSeverity,
  };
}
