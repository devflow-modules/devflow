import type { Confidence } from "@devflow/applyflow-core";

/**
 * Contratos do autofill assistido (por campo).
 */
export function fieldIdFromApplyFlowLabel(label: string): string {
  let h = 2166136261;
  for (let i = 0; i < label.length; i++) h = Math.imul(h ^ label.charCodeAt(i), 16777619);
  return `af_${(h >>> 0).toString(36)}`;
}

export type AutofillFieldTarget = {
  /** Identificador estável só para estado de UI/debug (derivado da pergunta). */
  fieldId: string;
  label: string;
  classificationType: string;
  suggestedValue: string;
  suggestionConfidence?: Confidence;
  classificationConfidence?: Confidence;
  /** `true` só após botão «Confirmar preenchimento» no cartão (low/unknown). */
  userConfirmedRisk?: boolean;
};

export type AutofillResult = {
  ok: boolean;
  reason?: string;
  /** Veto antes ou após resolver — não conta como erro de DOM. */
  blockedBySafetyGate?: boolean;
  /** Quando há resolução DOM (auditoria / sessão sem expor valores). */
  resolvedControlKind?: string;
};
