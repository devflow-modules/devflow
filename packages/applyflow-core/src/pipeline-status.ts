import type { ApplyFlowApplicationStatus } from "./application-types.js";

export const APPLYFLOW_PIPELINE_STATUS_V2 = [
  "found",
  "qualified",
  "skipped",
  "applying",
  "applied",
  "recruiter_contacted",
  "screening",
  "technical",
  "final",
  "offer",
  "hired",
  "rejected",
  "withdrawn",
] as const;

export type ApplyFlowPipelineStatusV2 = (typeof APPLYFLOW_PIPELINE_STATUS_V2)[number];

const V1_TO_V2: Record<ApplyFlowApplicationStatus, ApplyFlowPipelineStatusV2> = {
  reviewing: "qualified",
  applied: "applied",
  ignored: "skipped",
  waiting_response: "recruiter_contacted",
  interview: "screening",
  technical_test: "technical",
  rejected: "rejected",
  accepted: "offer",
  hired: "hired",
};

const V2_TO_V1: Record<ApplyFlowPipelineStatusV2, ApplyFlowApplicationStatus> = {
  found: "reviewing",
  qualified: "reviewing",
  skipped: "ignored",
  applying: "reviewing",
  applied: "applied",
  recruiter_contacted: "waiting_response",
  screening: "interview",
  technical: "technical_test",
  final: "interview",
  offer: "accepted",
  hired: "hired",
  rejected: "rejected",
  withdrawn: "ignored",
};

export const APPLYFLOW_PIPELINE_STATUS_V2_LABELS_PT: Record<ApplyFlowPipelineStatusV2, string> = {
  found: "Encontrada",
  qualified: "Qualificada",
  skipped: "Ignorada",
  applying: "Em candidatura",
  applied: "Aplicada",
  recruiter_contacted: "Recrutador contactou",
  screening: "Screening",
  technical: "Técnica",
  final: "Final",
  offer: "Proposta",
  hired: "Contratado",
  rejected: "Recusada",
  withdrawn: "Retirada",
};

export function isApplyFlowPipelineStatusV2(value: string): value is ApplyFlowPipelineStatusV2 {
  return (APPLYFLOW_PIPELINE_STATUS_V2 as readonly string[]).includes(value);
}

export function isApplyFlowApplicationStatusV1(value: string): value is ApplyFlowApplicationStatus {
  return value in V1_TO_V2;
}

/** Maps persisted V1 funnel status to the conceptual V2 pipeline. Lossy by design. */
export function toPipelineStatusV2(status: ApplyFlowApplicationStatus): ApplyFlowPipelineStatusV2 {
  return V1_TO_V2[status];
}

/** Maps a V2 pipeline status back to the persisted V1 funnel status. Lossy by design. */
export function fromPipelineStatusV2(status: ApplyFlowPipelineStatusV2): ApplyFlowApplicationStatus {
  return V2_TO_V1[status];
}

/**
 * Accepts a V1 or V2 status from JSON and returns the persisted V1 status.
 * Unknown values return null so importers can ignore the record.
 */
export function coerceImportedApplicationStatus(raw: string): ApplyFlowApplicationStatus | null {
  const value = raw.trim();
  if (isApplyFlowApplicationStatusV1(value)) return value;
  if (isApplyFlowPipelineStatusV2(value)) return fromPipelineStatusV2(value);
  return null;
}
