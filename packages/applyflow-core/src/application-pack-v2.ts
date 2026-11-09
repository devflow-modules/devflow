import type { ApplicationDecision, JobDecisionV2 } from "./application-decision-types.js";
import { applyBinaryKnockouts, recommendBinaryAnswer, type BinaryAnswerRecommendation } from "./binary-answers.js";
import { generateApplicationAnswers, type ApplicationAnswer } from "./application-answers-v2.js";
import type { ApplicationGate } from "./application-gates.js";
import type { CandidateInputRequest } from "./candidate-input.js";
import type { ClaimAudit, ClaimAuditResult } from "./claim-safety.js";
import { auditClaim, buildClaimAuditResult, recommendedClaims, splitTextClaims } from "./claim-safety.js";
import { recommendCompensation, type CompensationRecommendation } from "./compensation.js";
import type { Evidence } from "./evidence-types.js";
import { buildCandidateEvidence } from "./evidence-from-profile.js";
import { buildCvPersonalizationPlan, type CvPersonalizationPlan } from "./cv-personalization.js";
import { buildFollowUpPlan, type FollowUpPlan, type FollowUpStrategy } from "./follow-up-plan.js";
import { buildInterviewBrief, type InterviewBrief } from "./interview-brief.js";
import { buildNetworkingPlan, type NetworkingPlan } from "./networking-plan.js";
import { evaluateJobDecisionV2 } from "./evaluate-job-decision-v2.js";
import type { ResumeLanguage } from "./job-language.js";
import { normalizeJobTextForIntel } from "./job-intelligence.js";
import type { CandidateProfile } from "./profile-schema.js";
import { recommendResumeV2, selectResumeVariantForJob, type ResumeRecommendationV2 } from "./resume-router-v2.js";
import type { ApplyFlowJobSource } from "./job-match-types.js";
import type { ResumeLibrary, ResumeVariant } from "./resume-library-types.js";

export const APPLICATION_PACK_V2_VERSION = 2 as const;

export type ApplicationPackV2Status = "ready" | "needs_confirmation" | "blocked";

export type ApplicationPackConfirmation = {
  id: "resume_language";
  reason: string;
  jobLanguage?: ResumeLanguage;
  resumeLanguage?: ResumeLanguage;
};

/** Claims the audit removed, split by whether they were material to the application. */
export type ApplicationPackClaimHandling = {
  removedMaterial: string[];
  removedOptional: string[];
  /** Removed claims that still appear verbatim in applicant-facing text. Must stay empty. */
  unsafeInOutput: string[];
};

export type ApplicationPackV2 = {
  version: typeof APPLICATION_PACK_V2_VERSION;
  jobId: string;
  status: ApplicationPackV2Status;
  reason?: string;
  blockingRequirements?: string[];
  decision: ApplicationDecision;
  /** The decision the pack is based on, evaluated with the selected resume's evidence. */
  evaluation?: JobDecisionV2;
  evaluatedResumeVariantId?: string;
  confirmations?: ApplicationPackConfirmation[];
  claimHandling?: ApplicationPackClaimHandling;
  resumeRecommendation?: ResumeRecommendationV2;
  cvPersonalization?: CvPersonalizationPlan;
  applicationAnswers: ApplicationAnswer[];
  binaryQuestions: BinaryAnswerRecommendation[];
  compensation?: CompensationRecommendation;
  networkingPlan?: NetworkingPlan;
  followUpPlan?: FollowUpPlan;
  interviewBrief?: InterviewBrief;
  claimAudit: ClaimAuditResult;
  candidateInputs: CandidateInputRequest[];
  gates: ApplicationGate[];
};

export function canCreateApplicationPackV2(decision: ApplicationDecision): boolean {
  return decision === "apply_high" || decision === "apply_normal" || decision === "apply_stretch";
}

export function createApplicationPackV2(input: {
  jobId: string;
  jobText: string;
  jobTitle?: string;
  companyName?: string;
  source?: ApplyFlowJobSource;
  profile: CandidateProfile;
  evidence: readonly Evidence[];
  decision: JobDecisionV2;
  resumeLibrary?: ResumeLibrary;
  binaryQuestions?: { question: string; mandatory?: boolean }[];
  followUpStrategy?: FollowUpStrategy;
  now?: Date;
}): ApplicationPackV2 {
  const evaluated = evaluationForSelectedResume(input);
  const evaluation = evaluated.decision;
  const binaries = (input.binaryQuestions ?? []).map((item) =>
    recommendBinaryAnswer({
      question: item.question,
      mandatory: item.mandatory,
      profile: evaluated.profile,
      evidence: evaluated.evidence,
      decision: evaluation,
    }),
  );
  const knocked = applyBinaryKnockouts({
    decision: evaluation.decision,
    gates: evaluation.gates,
    binaries,
  });
  const decision = knocked.decision;
  const gates = knocked.gates;

  const blocking = [
    ...evaluation.matches.filter((item) => item.status === "gap" && item.requirement.mandatory).map((item) => item.requirement.label),
    ...gates.filter((item) => item.required && item.result === "fail").map((item) => item.label),
  ];

  const hardEligibility = evaluation.eligibility?.findings.find((item) => item.status === "ineligible");
  if (evaluation.eligibility?.status === "ineligible" || decision === "skip" || decision === "needs_info") {
    return {
      version: 2,
      jobId: input.jobId,
      status: "blocked",
      reason: hardEligibility
        ? hardEligibility.reason
        : decision === "needs_info"
          ? "Complete seu perfil para concluir a análise. Pack não é uma recomendação de candidatura."
          : "Decision is SKIP — pack is not a recommended application.",
      blockingRequirements: blocking,
      decision,
      evaluation,
      ...(evaluated.variantId ? { evaluatedResumeVariantId: evaluated.variantId } : {}),
      confirmations: [],
      applicationAnswers: [],
      binaryQuestions: binaries,
      claimAudit: buildClaimAuditResult(evaluation.claims),
      candidateInputs: evaluation.candidateInputRequests,
      gates,
    };
  }

  const resume = recommendResumeV2({
    jobText: input.jobText,
    decision: { ...evaluation, decision, gates },
    profile: evaluated.profile,
    library: input.resumeLibrary,
    source: input.source,
    now: input.now,
  });
  const selectedProfile = resume.variant.profile;
  const selectedEvidence = evidenceForSelectedResume(evaluated.evidence, evaluated.profile, resume, input.now);
  const scopedDecision = scopeDecisionEvidence(evaluation, selectedEvidence);
  const cv = buildCvPersonalizationPlan({
    profile: selectedProfile,
    evidence: selectedEvidence,
    decision: scopedDecision,
    resume,
    jobId: input.jobId,
  });
  const answers = generateApplicationAnswers({
    profile: selectedProfile,
    evidence: selectedEvidence,
    decision: scopedDecision,
    companyName: input.companyName,
    jobId: input.jobId,
    jobText: input.jobText,
    resumeVariantId: resume.variant.id,
    resumeVariantName: resume.variant.name,
  });
  const compensation = recommendCompensation({
    jobText: input.jobText,
    profile: selectedProfile,
    decision: evaluation,
    jobId: input.jobId,
  });
  const networking = buildNetworkingPlan({
    jobText: input.jobText,
    decision: scopedDecision,
    evidence: selectedEvidence,
    companyName: input.companyName,
    roleTitle: input.jobTitle,
  });
  const followUp = buildFollowUpPlan({ networking, strategy: input.followUpStrategy });
  const interviewBrief = buildInterviewBrief({
    jobText: input.jobText,
    jobTitle: input.jobTitle,
    companyName: input.companyName,
    decision: scopedDecision,
    evidence: selectedEvidence,
    salary: compensation.recommendation,
  });

  const confirmations = languageConfirmations(resume);
  const candidateInputs = [
    ...evaluation.candidateInputRequests,
    ...cv.candidateInputs,
    ...answers.candidateInputs,
    ...(compensation.candidateInput ? [compensation.candidateInput] : []),
    ...confirmations.map((item) => languageConfirmationInput(item, input.jobId)),
  ];

  const sameEvidence =
    selectedEvidence.length === input.evidence.length &&
    selectedEvidence.every((item, index) => item.id === input.evidence[index]?.id);
  const decisionClaims = sameEvidence
    ? evaluation.claims
    : evaluation.claims.map((item) =>
        auditClaim(item.claim, selectedEvidence, {
          resumeVariantId: resume.variant.id,
          resumeVariantName: resume.variant.name,
          englishLevel: selectedProfile.facts.englishLevel ?? selectedProfile.englishLevel,
        }),
      );
  const allClaims = [
    ...decisionClaims,
    ...answers.answers.flatMap((item) => item.claimAudit.claims),
  ];
  const claimAudit = buildClaimAuditResult(allClaims);
  const claimHandling = describeClaimHandling({
    decisionClaims: decisionClaims.map((item) => item.claim),
    claims: claimAudit.claims,
    applicantFacing: [
      ...answers.answers.map((item) => item.recommendedAnswer ?? ""),
      ...cv.experienceChanges.map((item) => item.proposed),
      cv.headline ?? "",
    ],
  });

  return {
    version: 2,
    jobId: input.jobId,
    status: confirmations.length > 0 ? "needs_confirmation" : "ready",
    ...(confirmations.length > 0 ? { reason: confirmations.map((item) => item.reason).join(" ") } : {}),
    decision,
    evaluation,
    evaluatedResumeVariantId: resume.variant.id,
    confirmations,
    claimHandling,
    resumeRecommendation: resume,
    cvPersonalization: cv,
    applicationAnswers: answers.answers,
    binaryQuestions: binaries,
    compensation: compensation.recommendation,
    networkingPlan: networking,
    followUpPlan: followUp,
    interviewBrief,
    claimAudit: {
      ...claimAudit,
      finalSafe: recommendedClaims(claimAudit.claims),
    },
    candidateInputs,
    gates,
  };
}

type PackInput = Parameters<typeof createApplicationPackV2>[0];

/**
 * Job → language → resume selection → selected evidence → matching/eligibility → decision.
 * The single entry point for a job's V2 decision and its pack; both share one evidence scope.
 */
export function evaluateJobApplicationV2(input: Omit<PackInput, "decision">): {
  decision: JobDecisionV2;
  pack: ApplicationPackV2;
} {
  const variant = input.resumeLibrary
    ? selectResumeVariantForJob({
        jobText: input.jobText,
        profile: input.profile,
        library: input.resumeLibrary,
        now: input.now,
      })
    : undefined;
  const switched = variant !== undefined && isOtherVariant(variant, input.profile);
  const profile = switched ? variant.profile : input.profile;
  const evidence = switched ? buildCandidateEvidence(variant.profile, [], input.now) : input.evidence;
  const decision = evaluateJobDecisionV2({ jobText: input.jobText, evidence, profile, jobId: input.jobId });
  const pack = createApplicationPackV2({ ...input, profile, evidence, decision });
  return { decision: pack.evaluation ?? decision, pack };
}

function isOtherVariant(variant: ResumeVariant, profile: CandidateProfile): boolean {
  if (variant.id === "profile-default" || variant.profile === profile) return false;
  return JSON.stringify(variant.profile) !== JSON.stringify(profile);
}

/** Re-evaluates the caller's decision when the selected resume is not the one it was computed with. */
function evaluationForSelectedResume(input: PackInput): {
  decision: JobDecisionV2;
  profile: CandidateProfile;
  evidence: readonly Evidence[];
  variantId?: string;
} {
  const variant = input.resumeLibrary
    ? selectResumeVariantForJob({
        jobText: input.jobText,
        profile: input.profile,
        library: input.resumeLibrary,
        now: input.now,
      })
    : undefined;
  if (!variant || !isOtherVariant(variant, input.profile)) {
    return {
      decision: input.decision,
      profile: input.profile,
      evidence: input.evidence,
      ...(variant ? { variantId: variant.id } : {}),
    };
  }
  const evidence = buildCandidateEvidence(variant.profile, [], input.now);
  return {
    decision: evaluateJobDecisionV2({ jobText: input.jobText, evidence, profile: variant.profile, jobId: input.jobId }),
    profile: variant.profile,
    evidence,
    variantId: variant.id,
  };
}

function evidenceForSelectedResume(
  callerEvidence: readonly Evidence[],
  callerProfile: CandidateProfile,
  resume: ResumeRecommendationV2,
  now?: Date,
): readonly Evidence[] {
  if (!isOtherVariant(resume.variant, callerProfile)) return callerEvidence;
  return buildCandidateEvidence(resume.variant.profile, [], now);
}

const LANGUAGE_LABELS: Record<ResumeLanguage, string> = {
  en: "inglês",
  "pt-BR": "português",
  unknown: "idioma não identificado",
};

function languageConfirmations(resume: ResumeRecommendationV2): ApplicationPackConfirmation[] {
  if (!resume.requiresLanguageConfirmation) return [];
  const job = resume.jobLanguage ?? "unknown";
  const cv = resume.resumeLanguage ?? "unknown";
  return [
    {
      id: "resume_language",
      jobLanguage: job,
      resumeLanguage: cv,
      reason:
        `A vaga está em ${LANGUAGE_LABELS[job]} e o currículo recomendado (${resume.variant.name}) está em ${LANGUAGE_LABELS[cv]}. ` +
        "Confirme antes de enviar; nenhuma tradução foi gerada.",
    },
  ];
}

function languageConfirmationInput(item: ApplicationPackConfirmation, jobId: string): CandidateInputRequest {
  return {
    id: `resume-language-${jobId}`,
    question: "Confirma o envio deste currículo num idioma diferente do anúncio?",
    reason: item.reason,
    relatedJobId: jobId,
    expectedType: "boolean",
    status: "pending",
    canBecomeEvidence: false,
  };
}

const MEASURED_OR_SCALE = /\d/;

function describeClaimHandling(input: {
  decisionClaims: readonly string[];
  claims: readonly ClaimAudit[];
  applicantFacing: readonly string[];
}): ApplicationPackClaimHandling {
  const fold = (value: string) => normalizeJobTextForIntel(value).trim();
  const decisionClaims = new Set(input.decisionClaims.map(fold));
  const facing = new Set(input.applicantFacing.flatMap((text) => splitTextClaims(text)).map(fold));
  const removed = input.claims.filter((item) => item.status === "remove");
  const unique = (values: string[]) => [...new Set(values)];
  return {
    removedMaterial: unique(
      removed.filter((item) => decisionClaims.has(fold(item.claim)) || MEASURED_OR_SCALE.test(item.claim)).map((item) => item.claim),
    ),
    removedOptional: unique(
      removed.filter((item) => !decisionClaims.has(fold(item.claim)) && !MEASURED_OR_SCALE.test(item.claim)).map((item) => item.claim),
    ),
    unsafeInOutput: unique(removed.filter((item) => facing.has(fold(item.claim))).map((item) => item.claim)),
  };
}

function scopeDecisionEvidence(decision: JobDecisionV2, evidence: readonly Evidence[]): JobDecisionV2 {
  const ids = new Set(evidence.map((item) => item.id));
  return {
    ...decision,
    matches: decision.matches.map((match) => {
      const matchedEvidence = match.matchedEvidence.filter((item) => ids.has(item.id));
      if (matchedEvidence.length > 0 || match.matchedEvidence.length === 0) return { ...match, matchedEvidence };
      return {
        ...match,
        matchedEvidence,
        status: match.status === "proven" ? "unknown" : match.status,
        reason: "The selected resume does not contain this evidence.",
      };
    }),
  };
}
