import type { CandidateInputRequest } from "./candidate-input.js";
import type { ClaimSafety } from "./claim-safety.js";
import { auditClaim } from "./claim-safety.js";
import type { Evidence } from "./evidence-types.js";
import type { JobDecisionV2 } from "./application-decision-types.js";
import type { CandidateProfile } from "./profile-schema.js";
import type { ResumeRecommendationV2 } from "./resume-router-v2.js";

export type CvChange = {
  section: "headline" | "summary" | "experience" | "skills";
  original?: string;
  proposed: string;
  supportingEvidenceIds: string[];
  claimSafety: Exclude<ClaimSafety, "remove">;
  relatedRequirementIds: string[];
  reason: string;
};

export type CvPersonalizationPlan = {
  headline?: string;
  summary?: string;
  experienceChanges: CvChange[];
  skillsChanges: CvChange[];
  removedClaims: string[];
  candidateInputs: CandidateInputRequest[];
};

function idsFrom(decision: JobDecisionV2, labelRe: RegExp): { evidenceIds: string[]; requirementIds: string[] } {
  const matches = decision.matches.filter((item) => labelRe.test(item.requirement.label) && item.status !== "gap");
  return {
    evidenceIds: matches.flatMap((item) => item.matchedEvidence.map((ev) => ev.id)),
    requirementIds: matches.map((item) => item.requirement.id),
  };
}

function acceptChange(proposed: string, evidence: readonly Evidence[]): CvChange | { remove: string } | { input: CandidateInputRequest } {
  const audit = auditClaim(proposed, evidence);
  if (audit.status === "remove") return { remove: proposed };
  return {
    section: "experience",
    proposed,
    supportingEvidenceIds: audit.supportingEvidence.map((item) => item.id),
    claimSafety: audit.status,
    relatedRequirementIds: [],
    reason: audit.reason,
  };
}

export function buildCvPersonalizationPlan(input: {
  profile: CandidateProfile;
  evidence: readonly Evidence[];
  decision: JobDecisionV2;
  resume: ResumeRecommendationV2;
  jobId?: string;
}): CvPersonalizationPlan {
  const removedClaims: string[] = [...input.resume.forbiddenKeywords];
  const candidateInputs: CandidateInputRequest[] = [];
  const experienceChanges: CvChange[] = [];
  const skillsChanges: CvChange[] = [];

  const headline = input.resume.recommendedHeadline ?? input.profile.roles[0];
  if (headline) {
    const audit = auditClaim(headline, input.evidence);
    if (audit.status === "remove") removedClaims.push(headline);
  }

  const summarySource = input.profile.answerBank.professionalSummary.trim();
  let summary: string | undefined;
  if (summarySource) {
    const audit = auditClaim(summarySource.slice(0, 280), input.evidence);
    if (audit.status === "remove") removedClaims.push(summarySource.slice(0, 280));
    else summary = summarySource;
  }

  for (const keyword of input.resume.allowedKeywords) {
    const proposed = `Emphasize professional work with ${keyword}.`;
    const result = acceptChange(proposed, input.evidence);
    if ("remove" in result) {
      removedClaims.push(result.remove);
      continue;
    }
    if ("input" in result) {
      candidateInputs.push(result.input);
      continue;
    }
    const refs = idsFrom(input.decision, new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    skillsChanges.push({
      ...result,
      section: "skills",
      relatedRequirementIds: refs.requirementIds,
      supportingEvidenceIds: result.supportingEvidenceIds.length ? result.supportingEvidenceIds : refs.evidenceIds,
      reason: `Keep ${keyword} only because evidence supports it.`,
    });
  }

  for (const forbidden of input.resume.forbiddenKeywords) {
    removedClaims.push(forbidden);
    const invented = `Add professional ${forbidden} experience.`;
    const audit = auditClaim(invented, input.evidence);
    if (audit.status !== "remove") {
      continue;
    }
  }

  const product = input.evidence.find((item) => item.subject === "project" && item.usableForClaims);
  if (product) {
    const proposed = `Lead with ${product.project ?? product.label} as end-to-end product ownership.`;
    const audit = auditClaim(proposed, input.evidence);
    if (audit.status !== "remove") {
      experienceChanges.push({
        section: "experience",
        proposed,
        supportingEvidenceIds: [product.id],
        claimSafety: audit.status,
        relatedRequirementIds: input.decision.matches
          .filter((item) => item.requirement.category === "product" && item.status !== "gap")
          .map((item) => item.requirement.id),
        reason: "Project evidence supports a product-ownership bullet.",
      });
    } else {
      removedClaims.push(proposed);
    }
  }

  const missingBullet = input.decision.matches.find((item) => item.status === "unknown" && item.requirement.requirementType === "experience");
  if (missingBullet) {
    candidateInputs.push({
      id: `cv-input-${missingBullet.requirement.id}`,
      question: `Há um caso profissional concreto para ${missingBullet.requirement.label}?`,
      reason: "A CV change would otherwise invent a bullet.",
      relatedJobId: input.jobId,
      relatedRequirementId: missingBullet.requirement.id,
      expectedType: "text",
      status: "pending",
      canBecomeEvidence: true,
    });
  }

  return {
    ...(headline && !removedClaims.includes(headline) ? { headline } : {}),
    ...(summary ? { summary } : {}),
    experienceChanges,
    skillsChanges,
    removedClaims: [...new Set(removedClaims)],
    candidateInputs,
  };
}
