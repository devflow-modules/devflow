import type { AutofillResult } from "./autofill-types.js";

export type ResolvedField =
  | { kind: "input"; el: HTMLInputElement }
  | { kind: "textarea"; el: HTMLTextAreaElement }
  | { kind: "select"; el: HTMLSelectElement }
  | { kind: "radio-group"; inputs: HTMLInputElement[] };

/** Usa setter nativo do protótipo (compatível com controlos geridos por React). */
function setNativeInputValue(el: HTMLInputElement, value: string): void {
  const d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  d?.set?.call(el, value);
}

function setNativeTextareaValue(el: HTMLTextAreaElement, value: string): void {
  const d = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  d?.set?.call(el, value);
}

function dispatchReactFriendlyInputCycle(el: HTMLElement): void {
  el.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true, cancelable: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

/** Normalização para texto de opções (sem diacríticos, minúsculas). */
export function normalizeOptionToken(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

type YesNoPolarity = "yes" | "no";

/** Interpreta valores de sugestão para grupos Yes/No (conservador). */
export function parseSuggestedYesNo(suggested: string): YesNoPolarity | null {
  const t = normalizeOptionToken(suggested);
  const compact = t.replace(/[^a-z0-9]+/g, "");
  if (/^(yes|sim|true|y)$/.test(compact)) return "yes";
  if (/^(no|nao|false|n)$/.test(compact)) return "no";
  if (/\b(sim|yes|true)\b/.test(` ${t} `) && !/\b(no|nao|false)\b/.test(` ${t} `)) return "yes";
  if (/\b(no|nao|false)\b/.test(` ${t} `)) return "no";
  return null;
}

function radioMatchesPolarity(input: HTMLInputElement, polarity: YesNoPolarity): boolean {
  const v = normalizeOptionToken(input.value);
  const label = normalizeOptionToken(input.labels?.[0]?.textContent ?? "");
  const pool = `${v} ${label}`.trim();
  if (polarity === "yes") {
    return /\b(sim|yes|true)\b/.test(pool) || v === "y" || v === "sim" || v === "yes" || v === "true";
  }
  return /\b(nao|no|false)\b/.test(pool) || v === "n" || v === "no" || v === "nao" || v === "false";
}

function chooseRadioForPolarity(inputs: HTMLInputElement[], polarity: YesNoPolarity): HTMLInputElement | null {
  let fallback: HTMLInputElement | null = null;
  for (const inp of inputs) {
    if (inp.disabled || inp.type !== "radio") continue;
    if (radioMatchesPolarity(inp, polarity)) {
      fallback = inp;
      break;
    }
  }
  if (fallback) return fallback;
  for (const inp of inputs) {
    const v = normalizeOptionToken(inp.value);
    if (polarity === "yes" && (v === "1" || v === "true")) return inp;
    if (polarity === "no" && (v === "0" || v === "false")) return inp;
  }
  return null;
}

/**
 * Resolve option de forma **conservadora**: só coincide se for inequívoco.
 */
export function findSelectOptionSafe(sel: HTMLSelectElement, suggested: string): HTMLOptionElement | null {
  const trimmed = suggested.trim();
  if (!trimmed) return null;
  const nTarget = normalizeOptionToken(trimmed);

  const options = [...sel.querySelectorAll<HTMLOptionElement>("option")].filter(
    (o) => !o.disabled && !(o.hidden ?? false),
  );

  /** match exato por atributo value */
  const byValue = options.filter((o) => normalizeOptionToken(o.value) === nTarget);
  if (byValue.length === 1) return byValue[0]!;

  /** match exato por texto visível */
  const byText = options.filter((o) => normalizeOptionToken(o.textContent ?? "") === nTarget);
  if (byText.length === 1) return byText[0]!;

  /** texto da opção contém toda a sugestão (ex.: opção "Advanced — full …" vs sugestão "Advanced…") */
  const containsSuggestion = options.filter((o) => normalizeOptionToken(o.textContent ?? "").includes(nTarget));
  if (containsSuggestion.length === 1) return containsSuggestion[0]!;

  return null;
}

function applyNumber(input: HTMLInputElement, suggested: string): AutofillResult {
  const trimmed = suggested.trim().replace(",", ".");
  const n = Number(trimmed);
  if (!Number.isFinite(n))
    return { ok: false, reason: `Valor "${suggested}" não é número válido para o campo.` };
  setNativeInputValue(input, String(trimmed.includes(".") ? n : Math.round(n)));
  dispatchReactFriendlyInputCycle(input);
  return { ok: true };
}

function applyTextInput(input: HTMLInputElement, suggested: string): AutofillResult {
  setNativeInputValue(input, suggested);
  dispatchReactFriendlyInputCycle(input);
  return { ok: true };
}

function applyTextarea(area: HTMLTextAreaElement, suggested: string): AutofillResult {
  setNativeTextareaValue(area, suggested);
  dispatchReactFriendlyInputCycle(area);
  return { ok: true };
}

function applySelect(sel: HTMLSelectElement, suggested: string): AutofillResult {
  const opt = findSelectOptionSafe(sel, suggested);
  if (!opt)
    return { ok: false, reason: `Nenhuma opção do menu corresponde de forma inequívoca à sugestão "${suggested}".` };
  sel.selectedIndex = opt.index;
  setNativeSelectValue(sel, opt.value);
  dispatchReactFriendlyInputCycle(sel);
  return { ok: true };
}

function setNativeSelectValue(el: HTMLSelectElement, value: string): void {
  const d = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  d?.set?.call(el, value);
}

function applyRadios(inputs: HTMLInputElement[], suggested: string): AutofillResult {
  const polarity = parseSuggestedYesNo(suggested);
  if (!polarity)
    return { ok: false, reason: `Não foi possível mapear "${suggested}" para Sim/Não.` };
  const target = chooseRadioForPolarity(inputs, polarity);
  if (!target) return { ok: false, reason: `Não há opção de rádio compatível com "${polarity}" visível.` };
  target.checked = true;
  target.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
  dispatchReactFriendlyInputCycle(target);
  return { ok: true };
}

/**
 * Anexa texto sugerido a um elemento já resolvido e visível.
 */
function assertControlEnabled(el: HTMLElement): AutofillResult | null {
  if (
    (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) &&
    el.disabled
  ) {
    return { ok: false, reason: "Campo desativado — não será preenchido." };
  }
  return null;
}

export function applySuggestedValueToResolved(resolved: ResolvedField, suggested: string): AutofillResult {
  const trimmed = suggested.trim();

  switch (resolved.kind) {
    case "textarea":
      return assertControlEnabled(resolved.el) ?? applyTextarea(resolved.el, trimmed);
    case "select":
      return assertControlEnabled(resolved.el) ?? applySelect(resolved.el, trimmed);
    case "radio-group": {
      const enabled = resolved.inputs.filter((r) => !r.disabled && r.type === "radio");
      if (!enabled.length) return { ok: false, reason: "Todas as opções de rádio estão desativadas." };
      return applyRadios(enabled, trimmed);
    }
    case "input": {
      const el = resolved.el;
      const dis = assertControlEnabled(el);
      if (dis) return dis;
      const t = (el.type || "text").toLowerCase();
      if (t === "number") return applyNumber(el, trimmed);
      if (t === "hidden") return { ok: false, reason: "Campo não suportado (hidden)." };
      return applyTextInput(el, trimmed);
    }
    default:
      return { ok: false, reason: "Controlo não reconhecido." };
  }
}
