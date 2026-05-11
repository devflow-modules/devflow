import type { Confidence } from "@devflow/applyflow-core";

import { applyFlowDebugLog } from "../applyflow-debug.js";
import { applySuggestedValueToResolved, type ResolvedField } from "./apply-field-value.js";
import { canAutofillField } from "./autofill-safety.js";
import type { AutofillFieldTarget, AutofillResult } from "./autofill-types.js";
import { resolveVisibleField } from "./field-control-resolver.js";
import { highlightFilledField } from "./highlight-filled-field.js";

function primaryHighlightTarget(modalRoot: HTMLElement, resolved: ResolvedField): HTMLElement {
  switch (resolved.kind) {
    case "radio-group": {
      const first = resolved.inputs[0];
      return (first?.closest("fieldset") as HTMLElement) ?? first ?? modalRoot;
    }
    case "textarea":
    case "select":
    case "input":
      return resolved.el;
  }
}

/** Tipo sintético para o safety gate pós-resolve. */
function resolvedFieldToControlSafetyType(resolved: ResolvedField): string {
  switch (resolved.kind) {
    case "input":
      return (resolved.el.type || "text").toLowerCase();
    case "textarea":
      return "textarea";
    case "select":
      return "select";
    case "radio-group":
      return "radio-group";
  }
}

function runSafetyGate(
  target: AutofillFieldTarget,
  opts: { controlType?: string },
): { ok: true } | { ok: false; reason: string } {
  const gate = canAutofillField({
    label: "",
    classificationType: target.classificationType,
    suggestionConfidence: (target.suggestionConfidence ?? "medium") as Confidence,
    fieldConfidence: target.classificationConfidence,
    suggestedValue: target.suggestedValue,
    controlType: opts.controlType,
    requiresConfirmation: target.userConfirmedRisk === true,
  });
  applyFlowDebugLog("safety gate", {
    allowed: gate.allowed,
    requiresConfirmation: gate.requiresConfirmation,
    fieldId: target.fieldId,
    controlType: opts.controlType ?? null,
    motivo: gate.reason ?? null,
  });
  if (!gate.allowed)
    return { ok: false, reason: gate.reason ?? "Bloqueado pelo safety gate ApplyFlow." };
  return { ok: true };
}

/** Resolve, valida segurança, aplica, destaca. Sem Next/Submit. */
export function linkedInEasyApplyAutofill(modalRoot: HTMLElement, target: AutofillFieldTarget): AutofillResult {
  const value = target.suggestedValue?.trim() ?? "";

  const pre = runSafetyGate(target, {});
  if (!pre.ok) return { ok: false, reason: pre.reason, blockedBySafetyGate: true };

  applyFlowDebugLog("autofill: tentativa", {
    fieldId: target.fieldId,
    classificationType: target.classificationType,
    valorLen: value.length,
  });

  const resolved = resolveVisibleField(modalRoot, target.label);
  if (!resolved) {
    applyFlowDebugLog("autofill: falha resolver", { motivo: "Controlo não encontrado ou invisível." });
    return { ok: false, reason: "Não foi encontrado um campo visível associado a esta pergunta neste passo." };
  }

  const controlKind = resolvedFieldToControlSafetyType(resolved);
  const post = runSafetyGate(target, { controlType: controlKind });
  if (!post.ok) return { ok: false, reason: post.reason, blockedBySafetyGate: true };

  applyFlowDebugLog("autofill: resolvido", {
    kind: resolved.kind,
    tipo: resolved.kind === "radio-group" ? `radio(${resolved.inputs.length})` : controlKind,
  });

  const applied = applySuggestedValueToResolved(resolved, value);

  if (!applied.ok) {
    applyFlowDebugLog("autofill: falha aplicar", applied);
    return { ...applied, resolvedControlKind: controlKind };
  }

  try {
    highlightFilledField(primaryHighlightTarget(modalRoot, resolved));
  } catch {
    /* ignore */
  }

  applyFlowDebugLog("autofill: sucesso", { fieldId: target.fieldId });
  return { ok: true, resolvedControlKind: controlKind };
}
