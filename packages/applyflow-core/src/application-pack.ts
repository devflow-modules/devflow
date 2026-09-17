import {
  APPLICATION_PACK_CHECKLIST_IDS,
  APPLICATION_PACK_SCHEMA_VERSION,
  APPLICATION_PACK_VERSION,
  type ApplicationPack,
  type ApplicationPackCandidateFacts,
  type ApplicationPackChecklistId,
  type ApplicationPackMatchSnapshot,
  type ApplicationPackResumeSource,
  type ApplicationPackSalaryFacts,
} from "./application-pack-types.js";
import { INCOMPLETE_ANALYSIS_MESSAGE } from "./application-decision-types.js";
import { evaluateJobMatch } from "./evaluate-job-match.js";
import { presentInboxJobAnalysis } from "./inbox-analysis-presentation.js";
import type { ApplyFlowJob, JobMatchDecision } from "./job-match-types.js";
import type { CandidateProfile } from "./profile-schema.js";
import { getDefaultResumeVariant } from "./resume-library.js";
import type { ResumeLibrary, ResumeVariant } from "./resume-library-types.js";

/** Skill-coverage V1 only. Not a final apply recommendation. */
export function isV1TechnicalApplyOrStretch(decision: JobMatchDecision): boolean {
  return decision === "apply" || decision === "stretch";
}

export type ApplicationPackOpResult =
  | { ok: true; job: ApplyFlowJob; library: ResumeLibrary }
  | { ok: false; error: string; job: ApplyFlowJob; library: ResumeLibrary };

export function canCreateApplicationPack(
  job: ApplyFlowJob,
  library?: ResumeLibrary | null,
  variantId?: string,
): boolean {
  if (!isV1TechnicalApplyOrStretch(job.jobMatch.decision)) return false;
  if (!library?.variants.length || !job.descriptionSnapshot?.trim()) {
    return true;
  }
  try {
    const profile = resolveApplicationPackResume(job, library, variantId).variant.profile;
    return presentInboxJobAnalysis(job, profile).allowPack;
  } catch {
    return false;
  }
}

export function isOpenableJobUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function optionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function snapshotCandidateFacts(profile: CandidateProfile): ApplicationPackCandidateFacts {
  const roles = profile.roles.map((role) => role.trim()).filter(Boolean);
  const cltPleno = optionalText(profile.salary.cltPleno);
  const cltSenior = optionalText(profile.salary.cltSenior);
  const pjSenior = optionalText(profile.salary.pjSenior);
  const usdMonthly = optionalText(profile.salary.usdMonthly);
  const usdHourly = optionalText(profile.salary.usdHourly);
  const location = optionalText(profile.location);
  const salary: ApplicationPackSalaryFacts = {
    ...(cltPleno ? { cltPleno } : {}),
    ...(cltSenior ? { cltSenior } : {}),
    ...(pjSenior ? { pjSenior } : {}),
    ...(usdMonthly ? { usdMonthly } : {}),
    ...(usdHourly ? { usdHourly } : {}),
  };
  const answerBank = {
    ...(optionalText(profile.answerBank.professionalSummary)
      ? { professionalSummary: profile.answerBank.professionalSummary.trim() }
      : {}),
    ...(optionalText(profile.answerBank.tellUsAboutYourself)
      ? { tellUsAboutYourself: profile.answerBank.tellUsAboutYourself.trim() }
      : {}),
    ...(optionalText(profile.answerBank.whyGoodFit) ? { whyGoodFit: profile.answerBank.whyGoodFit.trim() } : {}),
    ...(optionalText(profile.answerBank.availability) ? { availability: profile.answerBank.availability.trim() } : {}),
    ...(optionalText(profile.answerBank.hardestChallenge)
      ? { hardestChallenge: profile.answerBank.hardestChallenge.trim() }
      : {}),
    ...(optionalText(profile.answerBank.productCase) ? { productCase: profile.answerBank.productCase.trim() } : {}),
    ...(optionalText(profile.answerBank.frontendCase) ? { frontendCase: profile.answerBank.frontendCase.trim() } : {}),
    ...(optionalText(profile.answerBank.backendCase) ? { backendCase: profile.answerBank.backendCase.trim() } : {}),
    ...(optionalText(profile.answerBank.automationCase)
      ? { automationCase: profile.answerBank.automationCase.trim() }
      : {}),
    ...(optionalText(profile.answerBank.leadershipCase)
      ? { leadershipCase: profile.answerBank.leadershipCase.trim() }
      : {}),
  };

  return {
    ...(optionalText(profile.name) ? { name: profile.name.trim() } : {}),
    ...(location ? { location } : {}),
    ...(profile.englishLevel ? { englishLevel: profile.englishLevel } : {}),
    ...(typeof profile.comfortableInEnglish === "boolean"
      ? { comfortableInEnglish: profile.comfortableInEnglish }
      : {}),
    ...(roles.length > 0 ? { roles } : {}),
    ...(Object.keys(salary).length > 0 ? { salary } : {}),
    ...(Object.keys(answerBank).length > 0 ? { answerBank } : {}),
  };
}

export function resolveApplicationPackResume(
  job: ApplyFlowJob,
  library: ResumeLibrary,
  explicitVariantId?: string,
): { variant: ResumeVariant; source: ApplicationPackResumeSource } {
  if (explicitVariantId) {
    const explicit = library.variants.find((variant) => variant.id === explicitVariantId);
    if (!explicit) {
      throw new Error("A variante escolhida não existe na biblioteca.");
    }
    return { variant: explicit, source: "explicit" };
  }

  const recommendedId = job.curriculumRecommendation?.recommendedVariantId;
  const recommended = recommendedId
    ? library.variants.find((variant) => variant.id === recommendedId)
    : undefined;
  if (recommended) return { variant: recommended, source: "recommended" };

  const evaluated = job.evaluatedWith
    ? library.variants.find((variant) => variant.id === job.evaluatedWith?.variantId)
    : undefined;
  if (evaluated) return { variant: evaluated, source: "evaluated-with" };

  return { variant: getDefaultResumeVariant(library), source: "default" };
}

function copyMatch(match: ApplicationPackMatchSnapshot): ApplicationPackMatchSnapshot {
  return {
    score: match.score,
    decision: match.decision,
    matchedSkills: [...match.matchedSkills],
    missingSkills: [...match.missingSkills],
    scoringVersion: match.scoringVersion,
  };
}

function snapshotMatchForVariant(
  job: ApplyFlowJob,
  variant: ResumeVariant,
  now: Date,
): ApplicationPackMatchSnapshot {
  if (job.evaluatedWith?.variantId === variant.id) {
    return copyMatch(job.jobMatch);
  }

  const candidate = job.curriculumRecommendation?.candidates.find((item) => item.variantId === variant.id);
  if (candidate) {
    return {
      score: candidate.score,
      decision: candidate.decision,
      matchedSkills: [...candidate.matchedSkills],
      missingSkills: [...candidate.missingSkills],
      scoringVersion: job.curriculumRecommendation?.scoringVersion ?? job.jobMatch.scoringVersion,
    };
  }

  const evaluated = evaluateJobMatch(variant.profile, { skills: job.jobContext.skills }, { now });
  return {
    score: evaluated.score,
    decision: evaluated.decision,
    matchedSkills: [...evaluated.matchedSkills],
    missingSkills: [...evaluated.missingSkills],
    scoringVersion: evaluated.scoringVersion,
  };
}

function emptyChecklist(): ApplicationPack["checklist"] {
  return APPLICATION_PACK_CHECKLIST_IDS.map((id) => ({ id, done: false }));
}

export function createApplicationPack(input: {
  job: ApplyFlowJob;
  library: ResumeLibrary;
  variantId?: string;
  now?: Date;
}): ApplicationPackOpResult {
  const { job, library } = input;
  if (!canCreateApplicationPack(job, library, input.variantId)) {
    let presentedDecision: ReturnType<typeof presentInboxJobAnalysis>["decision"] | undefined;
    try {
      if (job.descriptionSnapshot?.trim()) {
        presentedDecision = presentInboxJobAnalysis(
          job,
          resolveApplicationPackResume(job, library, input.variantId).variant.profile,
        ).decision;
      }
    } catch {
      presentedDecision = undefined;
    }
    if (presentedDecision === "needs_info") {
      return { ok: false, error: `${INCOMPLETE_ANALYSIS_MESSAGE}. Pack V1 não está pronto.`, job, library };
    }
    return { ok: false, error: "Application Pack só está disponível para APPLY ou STRETCH.", job, library };
  }
  if (job.applicationPack) {
    return { ok: false, error: "Esta vaga já tem uma candidatura preparada.", job, library };
  }

  let variant: ResumeVariant;
  try {
    variant = resolveApplicationPackResume(job, library, input.variantId).variant;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Não foi possível escolher o currículo.",
      job,
      library,
    };
  }

  const now = input.now ?? new Date();
  const iso = now.toISOString();
  const match = snapshotMatchForVariant(job, variant, now);
  const pack: ApplicationPack = {
    version: APPLICATION_PACK_SCHEMA_VERSION,
    packVersion: APPLICATION_PACK_VERSION,
    createdAt: iso,
    updatedAt: iso,
    jobId: job.id,
    resume: {
      variantId: variant.id,
      variantName: variant.name,
      recommendedByRouter: job.curriculumRecommendation?.recommendedVariantId === variant.id,
    },
    match,
    highlights: [...match.matchedSkills],
    gaps: [...match.missingSkills],
    candidateFacts: snapshotCandidateFacts(variant.profile),
    checklist: emptyChecklist(),
  };

  return {
    ok: true,
    library,
    job: {
      ...job,
      applicationPack: pack,
      updatedAt: iso,
    },
  };
}

export function setApplicationPackChecklistItem(input: {
  job: ApplyFlowJob;
  itemId: ApplicationPackChecklistId;
  done: boolean;
  now?: Date;
}): ApplyFlowJob {
  const pack = input.job.applicationPack;
  if (!pack) return input.job;
  const iso = (input.now ?? new Date()).toISOString();
  return {
    ...input.job,
    updatedAt: iso,
    applicationPack: {
      ...pack,
      updatedAt: iso,
      resume: { ...pack.resume },
      match: copyMatch(pack.match),
      highlights: [...pack.highlights],
      gaps: [...pack.gaps],
      candidateFacts: { ...pack.candidateFacts },
      checklist: pack.checklist.map((item) => (item.id === input.itemId ? { ...item, done: input.done } : { ...item })),
    },
  };
}

export function markApplyFlowJobApplied(job: ApplyFlowJob, now?: Date): ApplyFlowJob {
  if (job.status === "applied") return job;
  return {
    ...job,
    status: "applied",
    updatedAt: (now ?? new Date()).toISOString(),
  };
}

export function replaceApplyFlowJob(jobs: ApplyFlowJob[], next: ApplyFlowJob): ApplyFlowJob[] {
  return jobs.map((job) => (job.id === next.id ? next : job));
}
