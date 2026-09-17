import { canCreateApplicationPackV2 } from "./application-pack-v2.js";
import type { ApplicationDecision } from "./application-decision-types.js";
import { buildCandidateEvidence } from "./evidence-from-profile.js";
import { evaluateJobDecisionV2 } from "./evaluate-job-decision-v2.js";
import type { ApplyFlowJob, JobMatchDecision } from "./job-match-types.js";
import type { CandidateProfile } from "./profile-schema.js";

export function mapV2DecisionToInbox(decision: ApplicationDecision): JobMatchDecision {
  if (decision === "needs_info") return "needs_info";
  if (decision === "skip") return "skip";
  if (decision === "apply_stretch") return "stretch";
  return "apply";
}

export type InboxJobAnalysisPresentation = {
  decision: JobMatchDecision;
  score: number;
  allowPack: boolean;
  source: "v1" | "v2";
  v2Decision?: ApplicationDecision;
};

/**
 * Inbox presentation prefers V2 when the job text exists, so skill-only V1 APPLY
 * cannot look like a strong recommendation while V2 is still inconclusive.
 */
export function presentInboxJobAnalysis(
  job: ApplyFlowJob,
  profile: CandidateProfile | null | undefined,
): InboxJobAnalysisPresentation {
  const v1Allow = job.jobMatch.decision === "apply" || job.jobMatch.decision === "stretch";
  const jobText = job.descriptionSnapshot?.trim() ?? "";
  if (!profile || !jobText) {
    return {
      decision: job.jobMatch.decision,
      score: job.jobMatch.score,
      allowPack: v1Allow,
      source: "v1",
    };
  }

  const v2 = evaluateJobDecisionV2({
    jobText,
    evidence: buildCandidateEvidence(profile),
    profile,
    jobId: job.id,
  });
  return {
    decision: mapV2DecisionToInbox(v2.decision),
    score: v2.overall,
    allowPack: v1Allow && canCreateApplicationPackV2(v2.decision),
    source: "v2",
    v2Decision: v2.decision,
  };
}
