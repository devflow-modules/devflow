import type { Confidence } from "@devflow/applyflow-core";

export type SafetyGateInput = {
  label: string;
  classificationType: string;
  suggestionConfidence: Confidence;
  fieldConfidence?: Confidence;
  suggestedValue: string;
  /** Tipo nominal do DOM após resolver (ex.: `"number"` | `"text"` | `"radio-group"`); use para veto final. */
  controlType?: string;
  /** `true` se o utilizador já confirmou preenchimento de risco explícito (baixa confiança / tipo desconhecido). */
  requiresConfirmation?: boolean;
};

export type SafetyGateOutput = {
  allowed: boolean;
  requiresConfirmation: boolean;
  reason?: string;
};

function baseClassificationType(classificationType: string): string {
  const s = classificationType.trim();
  const i = s.indexOf(":");
  return i === -1 ? s : s.slice(0, i);
}

const BLOCKED_DOM_TYPES = ["submit", "button", "reset", "image", "file", "hidden"] as const;

/** Veto quando o tipo de controlo equivale a navegação submissão. */
export function isBlockedAutofillDomType(controlType?: string): boolean {
  if (!controlType?.trim()) return false;
  const t = controlType.trim().toLowerCase();
  if ((BLOCKED_DOM_TYPES as readonly string[]).includes(t)) return true;
  if (t === "next" || t.includes("submit") || t.includes("next")) return true;
  return false;
}

/**
 * Camada de segurança antes de escrever no DOM.
 * - Valores vazios: bloqueado (sem confirmação possível).
 * - `unknown` / baixa confiança: exige `requiresConfirmation === true` após ação explícita do utilizador.
 */
export function canAutofillField(input: SafetyGateInput): SafetyGateOutput {
  const value = input.suggestedValue?.trim() ?? "";
  if (!value) {
    return { allowed: false, requiresConfirmation: false, reason: "Valor sugerido vazio — use Copiar ou edite o perfil." };
  }

  if (isBlockedAutofillDomType(input.controlType)) {
    return {
      allowed: false,
      requiresConfirmation: false,
      reason: `Tipo de controlo não permitido para autofill (${input.controlType}).`,
    };
  }

  const base = baseClassificationType(input.classificationType);
  const userOk = input.requiresConfirmation === true;

  if (base === "unknown" && !userOk) {
    return {
      allowed: false,
      requiresConfirmation: true,
      reason: "Classificação desconhecida — confirme o preenchimento se aceitar o risco deste campo.",
    };
  }

  if (input.suggestionConfidence === "low" && !userOk) {
    return {
      allowed: false,
      requiresConfirmation: true,
      reason: "Confiança da sugestão baixa — confirme o preenchimento antes de aplicar.",
    };
  }

  if (input.fieldConfidence === "low" && !userOk) {
    return {
      allowed: false,
      requiresConfirmation: true,
      reason: "Confiança baixa na classificação do campo — confirme o preenchimento antes de aplicar.",
    };
  }

  /* high / medium (e low só após confirmação explícita nos ramos acima). */
  return { allowed: true, requiresConfirmation: false };
}
