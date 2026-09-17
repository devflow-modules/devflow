import type { ApplicationDecision, JobDecisionV2 } from "./application-decision-types.js";
import { applyBinaryKnockouts, recommendBinaryAnswer, type BinaryAnswerRecommendation } from "./binary-answers.js";
import { generateApplicationAnswers, type ApplicationAnswer } from "./application-answers-v2.js";
import type { ApplicationGate } from "./application-gates.js";
import type { CandidateInputRequest } from "./candidate-input.js";
import type { ClaimAuditResult } from "./claim-safety.js";
import { buildClaimAuditResult, recommendedClaims } from "./claim-safety.js";
import { recommendCompensation, type CompensationRecommendation } from "./compensation.js";
import type { Evidence } from "./evidence-types.js";
import { buildCvPersonalizationPlan, type CvPersonalizationPlan } from "./cv-personalization.js";
import { buildFollowUpPlan, type FollowUpPlan, type FollowUpStrategy } from "./follow-up-plan.js";
import { buildInterviewBrief, type InterviewBrief } from "./interview-brief.js";
import { buildNetworkingPlan, type NetworkingPlan } from "./networking-plan.js";
import type { CandidateProfile } from "./profile-schema.js";
import { recommendResumeV2, type ResumeRecommendationV2 } from "./resume-router-v2.js";
import type { ApplyFlowJobSource } from "./job-match-types.js";
import type { ResumeLibrary } from "./resume-library-types.js";

export const APPLICATION_PACK_V2_VERSION = 2 as const;

export type ApplicationPackV2Status = "ready" | "blocked";

export type ApplicationPackV2 = {
  version: typeof APPLICATION_PACK_V2_VERSION;
  jobId: string;
  status: ApplicationPackV2Status;
  reason?: string;
  blockingRequirements?: string[];
  decision: ApplicationDecision;
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
  const binaries = (input.binaryQuestions ?? []).map((item) =>
    recommendBinaryAnswer({
      question: item.question,
      mandatory: item.mandatory,
      profile: input.profile,
      evidence: input.evidence,
      decision: input.decision,
    }),
  );
  const knocked = applyBinaryKnockouts({
    decision: input.decision.decision,
    gates: input.decision.gates,
    binaries,
  });
  const decision = knocked.decision;
  const gates = knocked.gates;

  const blocking = [
    ...input.decision.matches.filter((item) => item.status === "gap" && item.requirement.mandatory).map((item) => item.requirement.label),
    ...gates.filter((item) => item.required && item.result === "fail").map((item) => item.label),
  ];

  if (decision === "skip" || decision === "needs_info") {
    return {
      version: 2,
      jobId: input.jobId,
      status: "blocked",
      reason:
        decision === "needs_info"
          ? "Complete seu perfil para concluir a análise. Pack não é uma recomendação de candidatura."
          : "Decision is SKIP — pack is not a recommended application.",
      blockingRequirements: blocking,
      decision,
      applicationAnswers: [],
      binaryQuestions: binaries,
      claimAudit: buildClaimAuditResult(input.decision.claims),
      candidateInputs: input.decision.candidateInputRequests,
      gates,
    };
  }

  const resume = recommendResumeV2({
    jobText: input.jobText,
    decision: { ...input.decision, decision, gates },
    profile: input.profile,
    library: input.resumeLibrary,
    source: input.source,
    now: input.now,
  });
  const cv = buildCvPersonalizationPlan({
    profile: input.profile,
    evidence: input.evidence,
    decision: input.decision,
    resume,
    jobId: input.jobId,
  });
  const answers = generateApplicationAnswers({
    profile: input.profile,
    evidence: input.evidence,
    decision: input.decision,
    companyName: input.companyName,
    jobId: input.jobId,
  });
  const compensation = recommendCompensation({
    jobText: input.jobText,
    profile: input.profile,
    decision: input.decision,
    jobId: input.jobId,
  });
  const networking = buildNetworkingPlan({
    jobText: input.jobText,
    decision: input.decision,
    evidence: input.evidence,
    companyName: input.companyName,
    roleTitle: input.jobTitle,
  });
  const followUp = buildFollowUpPlan({ networking, strategy: input.followUpStrategy });
  const interviewBrief = buildInterviewBrief({
    jobText: input.jobText,
    jobTitle: input.jobTitle,
    companyName: input.companyName,
    decision: input.decision,
    evidence: input.evidence,
    salary: compensation.recommendation,
  });

  const candidateInputs = [
    ...input.decision.candidateInputRequests,
    ...cv.candidateInputs,
    ...answers.candidateInputs,
    ...(compensation.candidateInput ? [compensation.candidateInput] : []),
  ];

  const allClaims = [
    ...input.decision.claims,
    ...answers.answers.flatMap((item) => item.claimAudit.claims),
  ];
  const claimAudit = buildClaimAuditResult(allClaims);

  return {
    version: 2,
    jobId: input.jobId,
    status: "ready",
    decision,
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
