import { getSuggestedAnswer } from "./answer-rules.js";
import { computeCopilotJobMatch, type JobMatchResult } from "./copilot-job-match.js";
import type { CandidateProfile } from "./profile-schema.js";
import {
  recommendResumeTrack,
  type ResumeRecommendation,
} from "./resume-track-router.js";
import type { Confidence, SuggestionSource } from "./types.js";

export type PreparedFieldSource = SuggestionSource;

export type PreparedFieldStatus = "ready" | "needs_review" | "missing" | "blocked";

export type PreparedField = {
  fieldId: string;
  label: string;
  classificationType: string;
  suggestedValue?: string;
  source: PreparedFieldSource;
  confidence: Confidence;
  status: PreparedFieldStatus;
  reason?: string;
};

export type ApplicationPreparationSummary = {
  total: number;
  ready: number;
  needsReview: number;
  missing: number;
  blocked: number;
};

export type ApplicationPreparation = {
  match: JobMatchResult;
  resume: ResumeRecommendation;
  fields: PreparedField[];
  summary: ApplicationPreparationSummary;
};

export type PreparationFieldInput = {
  fieldId: string;
  label: string;
  classificationType: string;
  classificationConfidence?: Confidence;
};

const NAVIGATION_TYPE_RE = /\b(submit|next|continue|enviar|proximo|avançar|avancar)\b/i;

export function isBlockedNavigationClassification(classificationType: string): boolean {
  const t = classificationType.trim().toLowerCase();
  if (!t) return false;
  if (t === "submit" || t === "next" || t === "continue" || t === "button") return true;
  return NAVIGATION_TYPE_RE.test(t);
}

function baseClassificationType(classificationType: string): string {
  const s = classificationType.trim();
  const i = s.indexOf(":");
  return i === -1 ? s : s.slice(0, i);
}

export function copilotSnapshotForHistory(prep: ApplicationPreparation): {
  fitScore: number;
  matchDecision: ApplicationPreparation["match"]["decision"];
  resumeTrack: ApplicationPreparation["resume"]["track"];
  strengthsSummary: string[];
  gapsSummary: string[];
  preparationStatus: ApplicationPreparationSummary;
} {
  return {
    fitScore: prep.match.score,
    matchDecision: prep.match.decision,
    resumeTrack: prep.resume.track,
    strengthsSummary: prep.match.strengths.slice(0, 8).map((item) => item.slice(0, 48)),
    gapsSummary: prep.match.gaps.slice(0, 8).map((item) => item.slice(0, 48)),
    preparationStatus: prep.summary,
  };
}

export function summarizePreparedFields(fields: readonly PreparedField[]): ApplicationPreparationSummary {
  const summary: ApplicationPreparationSummary = {
    total: fields.length,
    ready: 0,
    needsReview: 0,
    missing: 0,
    blocked: 0,
  };
  for (const field of fields) {
    if (field.status === "ready") summary.ready += 1;
    else if (field.status === "needs_review") summary.needsReview += 1;
    else if (field.status === "missing") summary.missing += 1;
    else summary.blocked += 1;
  }
  return summary;
}

export function prepareField(input: PreparationFieldInput, profile: CandidateProfile): PreparedField {
  const classificationType = input.classificationType.trim() || "unknown";
  const base = baseClassificationType(classificationType);
  const suggestion = getSuggestedAnswer(input.label, profile);
  const value = suggestion.value.trim();
  const source: PreparedFieldSource = suggestion.source ?? (value ? "heuristic" : "unknown");
  const confidence = suggestion.confidence;
  const fieldConfidence = input.classificationConfidence ?? "medium";

  if (isBlockedNavigationClassification(classificationType) || isBlockedNavigationClassification(base)) {
    return {
      fieldId: input.fieldId,
      label: input.label,
      classificationType,
      suggestedValue: value || undefined,
      source,
      confidence,
      status: "blocked",
      reason: "Campo de navegação / submissão — o ApplyFlow nunca preenche Submit, Next ou Continue.",
    };
  }

  if (base === "unknown") {
    if (!value) {
      return {
        fieldId: input.fieldId,
        label: input.label,
        classificationType,
        source: "unknown",
        confidence: "low",
        status: "missing",
        reason: suggestion.warning ?? "Classificação desconhecida e sem valor seguro.",
      };
    }
    return {
      fieldId: input.fieldId,
      label: input.label,
      classificationType,
      suggestedValue: value,
      source,
      confidence: confidence === "high" ? "medium" : confidence,
      status: "needs_review",
      reason: "Classificação desconhecida — rever antes de preencher.",
    };
  }

  if (!value || source === "unknown") {
    return {
      fieldId: input.fieldId,
      label: input.label,
      classificationType,
      source: "unknown",
      confidence: "low",
      status: "missing",
      reason: suggestion.warning ?? "Fato ou resposta em falta — não inventar.",
    };
  }

  if (confidence === "low" || fieldConfidence === "low") {
    return {
      fieldId: input.fieldId,
      label: input.label,
      classificationType,
      suggestedValue: value,
      source,
      confidence: "low",
      status: "needs_review",
      reason: suggestion.warning ?? "Confiança baixa — rever antes de preencher.",
    };
  }

  if (suggestion.warning) {
    return {
      fieldId: input.fieldId,
      label: input.label,
      classificationType,
      suggestedValue: value,
      source,
      confidence,
      status: "needs_review",
      reason: suggestion.warning,
    };
  }

  return {
    fieldId: input.fieldId,
    label: input.label,
    classificationType,
    suggestedValue: value,
    source,
    confidence,
    status: "ready",
  };
}

/**
 * Gera preparação da candidatura sem tocar no DOM.
 * O preenchimento só ocorre depois de um clique explícito na extensão.
 */
export function prepareApplication(input: {
  profile: CandidateProfile;
  jobText: string;
  fields: readonly PreparationFieldInput[];
  match?: JobMatchResult;
  resume?: ResumeRecommendation;
}): ApplicationPreparation {
  const match = input.match ?? computeCopilotJobMatch(input.profile, input.jobText);
  const resume = input.resume ?? recommendResumeTrack({ profile: input.profile, jobText: input.jobText, match });
  const fields = input.fields.map((field) => prepareField(field, input.profile));
  return {
    match,
    resume,
    fields,
    summary: summarizePreparedFields(fields),
  };
}
