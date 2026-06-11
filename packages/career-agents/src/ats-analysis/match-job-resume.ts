import { computeAtsScore } from "../shared/scoring.js";
import type { JobAnalysisOutput } from "../job-analysis/types.js";
import type { ResumeAnalysisOutput } from "../resume-analysis/types.js";
import type { AtsMatchOutput } from "./types.js";

export function matchJobToResume(job: JobAnalysisOutput, resume: ResumeAnalysisOutput): AtsMatchOutput {
  const resumeSkillNames = resume.normalizedSkills.map((s) => s.name);
  const resumeSet = new Set(resumeSkillNames.map((s) => s.toLowerCase()));

  const requiredNames = job.requiredSkills.map((s) => s.name);
  const niceNames = job.niceToHaveSkills.map((s) => s.name);
  const jobSkillNames = [...requiredNames, ...niceNames];

  const matchedSkills = jobSkillNames.filter((name) => resumeSet.has(name.toLowerCase()));
  const missingSkills = requiredNames.filter((name) => !resumeSet.has(name.toLowerCase()));

  const evidenceGaps = missingSkills.map((skill) => `No resume evidence for required skill: ${skill}`);

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

  const score = computeAtsScore({
    requiredJobSkills: job.requiredSkills,
    niceJobSkills: job.niceToHaveSkills,
    resumeSkillNames,
  });

  return {
    score,
    matchedSkills: [...new Set(matchedSkills)],
    missingSkills: [...new Set(missingSkills)],
    evidenceGaps,
    suggestedImprovements: [...new Set(suggestedImprovements)],
  };
}
