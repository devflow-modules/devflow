import type { PreparedField } from "@devflow/applyflow-core";
import { isBlockedNavigationClassification } from "@devflow/applyflow-core";

import { canAutofillField } from "./autofill-safety.js";
import type { AutofillFieldTarget } from "./autofill-types.js";

function baseClassificationType(classificationType: string): string {
  const s = classificationType.trim();
  const i = s.indexOf(":");
  return i === -1 ? s : s.slice(0, i);
}

/**
 * Bulk fill only for fields that are already safe — never submit/next/unknown/low/missing.
 * Does not set userConfirmedRisk; low/unknown stay out of the batch.
 */
export function isSafeBulkFillField(field: PreparedField): boolean {
  if (field.status !== "ready") return false;
  if (field.confidence !== "high" && field.confidence !== "medium") return false;
  const value = field.suggestedValue?.trim() ?? "";
  if (!value) return false;
  if (field.source === "unknown" || field.source === "ai") return false;
  if (isBlockedNavigationClassification(field.classificationType)) return false;
  const base = baseClassificationType(field.classificationType);
  if (base === "unknown" || base === "submit" || base === "next" || base === "continue" || base === "button") {
    return false;
  }

  const gate = canAutofillField({
    label: field.label,
    classificationType: field.classificationType,
    suggestionConfidence: field.confidence,
    suggestedValue: value,
    requiresConfirmation: false,
  });
  return gate.allowed === true && gate.requiresConfirmation !== true;
}

export function selectSafeBulkFillTargets(fields: readonly PreparedField[]): AutofillFieldTarget[] {
  return fields.filter(isSafeBulkFillField).map((field) => ({
    fieldId: field.fieldId,
    label: field.label,
    classificationType: field.classificationType,
    suggestedValue: field.suggestedValue!.trim(),
    suggestionConfidence: field.confidence,
    userConfirmedRisk: false,
  }));
}

export type SafeBulkFillOutcome = {
  filled: number;
  failed: number;
  awaitingReview: number;
  skippedBlocked: number;
};
