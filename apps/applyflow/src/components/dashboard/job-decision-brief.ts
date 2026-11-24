import {
  JOB_DECISION_BRIEF_ASKS_EMPTY,
  JOB_DECISION_BRIEF_CONFIRM_EMPTY,
  JOB_DECISION_BRIEF_SHOWS_EMPTY,
  JOB_DECISION_V2_PACK_BLOCK_KIND_LABELS,
} from "@/components/dashboard/job-decision-v2-content";
import type { JobDecisionV2, PackBlockExplanation } from "@devflow/applyflow-core";

export type JobDecisionBriefSection = {
  items: string[];
  empty: string;
};

export type JobDecisionBrief = {
  asks: JobDecisionBriefSection;
  shows: JobDecisionBriefSection;
  confirm: JobDecisionBriefSection;
};

function uniqueLabels(labels: readonly string[], limit = 8): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of labels) {
    const label = raw.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Organizes already-available Match / Pack-block signals into three decision questions.
 * Does not invent requirements; insufficient evidence stays distinct from unmet requirements.
 */
export function buildJobDecisionBrief(input: {
  decision: JobDecisionV2 | null | undefined;
  packBlock?: PackBlockExplanation | null;
}): JobDecisionBrief {
  const decision = input.decision;
  const matches = decision?.matches ?? [];

  const asks = uniqueLabels(
    matches.map((match) => {
      const req = match.requirement;
      if (req.importance === "nice_to_have") return `${req.label} (desejável)`;
      if (req.mandatory || req.importance === "fundamental") return `${req.label} (obrigatório)`;
      return req.label;
    }),
  );

  const shows = uniqueLabels(
    matches
      .filter((match) => match.status === "proven" || match.status === "partial")
      .map((match) => {
        const status = match.status === "partial" ? "parcial" : "demonstrado";
        return `${match.requirement.label} (${status})`;
      }),
  );

  const confirmFromMatches = matches
    .filter((match) => match.status === "gap" || match.status === "unknown")
    .map((match) => {
      const mandatoryTag =
        match.requirement.mandatory || match.requirement.importance === "fundamental" ? "obrigatório · " : "";
      if (match.status === "unknown") {
        return `${JOB_DECISION_V2_PACK_BLOCK_KIND_LABELS.evidence}: ${mandatoryTag}${match.requirement.label}`;
      }
      // Explicit negative evidence / below-bar tenure — distinct from unknown pending confirmation.
      return `${JOB_DECISION_V2_PACK_BLOCK_KIND_LABELS.incompatible}: ${mandatoryTag}${match.requirement.label}`;
    });

  const confirmFromBlock = (input.packBlock?.items ?? []).map((item) => {
    const kind = JOB_DECISION_V2_PACK_BLOCK_KIND_LABELS[item.kind] ?? JOB_DECISION_V2_PACK_BLOCK_KIND_LABELS.neutral;
    return `${kind}: ${item.label}`;
  });

  const confirm = uniqueLabels([...confirmFromBlock, ...confirmFromMatches]);

  return {
    asks: { items: asks, empty: JOB_DECISION_BRIEF_ASKS_EMPTY },
    shows: { items: shows, empty: JOB_DECISION_BRIEF_SHOWS_EMPTY },
    confirm: { items: confirm, empty: JOB_DECISION_BRIEF_CONFIRM_EMPTY },
  };
}
