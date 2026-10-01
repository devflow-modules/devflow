import {
  getDefaultResumeVariant,
  hashJobDescription,
  type ApplyFlowJobMatch,
  type CandidateProfile,
  type JobMatchDecision,
  type ResumeLibrary,
} from "@devflow/applyflow-core";

import { hasAnalyzableJobDescription, ingestDiscoveredJobHit } from "./save-hit";
import type { JobSearchHit } from "./types";

/** Compact projection of existing Match Engine output — not a second score model. */
export type JobMatchPreview = Pick<
  ApplyFlowJobMatch,
  "score" | "decision" | "matchedSkills" | "missingSkills" | "unknownSkills" | "scoringVersion"
>;

export type DiscoveryPreviewStatus = "idle" | "evaluating" | "ready" | "needs_description" | "error";

export type DiscoveryHitPreviewState = {
  status: DiscoveryPreviewStatus;
  preview?: JobMatchPreview;
  /** Fingerprint used to detect stale previews. */
  fingerprint?: string;
};

export function discoveryHitKey(hit: Pick<JobSearchHit, "source" | "externalId">): string {
  return `${hit.source}:${hit.externalId}`;
}

/**
 * Stable local fingerprint for CV/profile invalidation.
 * Never sent to providers or the search API.
 */
export function matchProfileFingerprint(library: ResumeLibrary | null | undefined): string | null {
  if (!library || library.variants.length === 0) return null;
  try {
    const variant = getDefaultResumeVariant(library);
    return `${variant.id}|${variant.updatedAt}`;
  } catch {
    return null;
  }
}

export function previewInputFingerprint(
  hit: JobSearchHit,
  profileFingerprint: string | null,
): string | null {
  if (!profileFingerprint) return null;
  if (!hasAnalyzableJobDescription(hit.description)) return null;
  const description = hit.description?.trim() ?? "";
  return `${discoveryHitKey(hit)}|${hashJobDescription(description)}|${profileFingerprint}`;
}

function projectJobMatch(match: ApplyFlowJobMatch): JobMatchPreview {
  return {
    score: match.score,
    decision: match.decision,
    matchedSkills: match.matchedSkills,
    missingSkills: match.missingSkills,
    ...(match.unknownSkills && match.unknownSkills.length > 0
      ? { unknownSkills: match.unknownSkills }
      : {}),
    scoringVersion: match.scoringVersion,
  };
}

/**
 * Transient Match Engine evaluation for discovery.
 * Uses ingestDiscoveredJobHit → ingestApplyFlowJob → evaluateJobMatch.
 * The temporary ApplyFlowJob is discarded; callers must not persist it.
 */
export function evaluateDiscoveredJobHitPreview(
  hit: JobSearchHit,
  options: {
    profile: CandidateProfile;
    resumeLibrary?: ResumeLibrary;
    now?: Date;
  },
):
  | { ok: true; preview: JobMatchPreview }
  | { ok: false; reason: "missing_description" | "invalid_external_id" | "evaluation_failed" } {
  try {
    const prepared = ingestDiscoveredJobHit(hit, options);
    if (!prepared.ok) {
      return {
        ok: false,
        reason: prepared.reason === "missing_description" ? "missing_description" : "invalid_external_id",
      };
    }
    // Discard temporary ApplyFlowJob — only the Match Engine projection is retained.
    return { ok: true, preview: projectJobMatch(prepared.job.jobMatch) };
  } catch {
    return { ok: false, reason: "evaluation_failed" };
  }
}

export function areJobMatchPreviewsEqual(a: JobMatchPreview, b: JobMatchPreview): boolean {
  const unknownA = a.unknownSkills ?? [];
  const unknownB = b.unknownSkills ?? [];
  return (
    a.score === b.score &&
    a.decision === b.decision &&
    a.scoringVersion === b.scoringVersion &&
    a.matchedSkills.join("\0") === b.matchedSkills.join("\0") &&
    a.missingSkills.join("\0") === b.missingSkills.join("\0") &&
    unknownA.join("\0") === unknownB.join("\0")
  );
}

export type DiscoveryResultSort = "default" | "match";

/**
 * Sort only the currently loaded hits. Unevaluated / needs_description go after ready previews.
 * needs_info keeps its real score (often 0) but is not inventing a fake ranking model.
 */
export function sortDiscoveryHitsByMatch(
  hits: readonly JobSearchHit[],
  previews: Readonly<Record<string, DiscoveryHitPreviewState>>,
): JobSearchHit[] {
  return [...hits].sort((left, right) => {
    const leftState = previews[discoveryHitKey(left)];
    const rightState = previews[discoveryHitKey(right)];
    const leftReady = leftState?.status === "ready" && leftState.preview;
    const rightReady = rightState?.status === "ready" && rightState.preview;
    if (leftReady && rightReady) {
      if (leftState.preview!.score !== rightState.preview!.score) {
        return rightState.preview!.score - leftState.preview!.score;
      }
      return discoveryHitKey(left).localeCompare(discoveryHitKey(right));
    }
    if (leftReady && !rightReady) return -1;
    if (!leftReady && rightReady) return 1;
    return 0;
  });
}

export type { JobMatchDecision };
