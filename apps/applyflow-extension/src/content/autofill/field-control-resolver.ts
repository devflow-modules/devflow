import { normalizeLinkedInLabel } from "@devflow/applyflow-linkedin";

import type { ResolvedField } from "./apply-field-value.js";

const LABEL_SELECTOR = [
  "label[for]",
  "label:not([for])",
  "fieldset legend",
  ".jobs-easy-apply-form-element__label",
  ".jobs-easy-apply-form-element__label-text",
  ".fb-dash-form-element__label",
  ".fb-dash-form-element__label-text",
  "[data-test-form-builder-modal-form-element] label",
  ".jobs-easy-apply-form-element .text-body-medium",
  ".jobs-easy-apply-form-element .text-body-small",
].join(",");

const CONTROL_SELECTOR = [
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]):not([type="file"]):not([type="checkbox"])',
  "select",
  "textarea",
].join(",");

function getWindow(modalRoot: HTMLElement): Window | null {
  return modalRoot.ownerDocument.defaultView ?? null;
}

/** Visibilidade dentro do modal (alinhado a `easy-apply-parser`). */
export function isElementAcceptable(el: HTMLElement, modalRoot: HTMLElement): boolean {
  const win = getWindow(modalRoot);
  if (!(el instanceof HTMLElement) || !win) return false;
  if (
    (el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement ||
      el instanceof HTMLButtonElement) &&
    el.disabled
  )
    return false;
  let cur: Element | null = el;
  while (cur && modalRoot.contains(cur)) {
    if (cur instanceof HTMLElement) {
      if (cur.hidden) return false;
      const ah = cur.getAttribute("aria-hidden");
      if (ah === "true") return false;
      const style = win.getComputedStyle(cur);
      if (style.display === "none" || style.visibility === "hidden") return false;
      const opacity = Number.parseFloat(style.opacity);
      if (Number.isFinite(opacity) && opacity === 0) return false;
    }
    cur = cur.parentElement;
  }
  if (!modalRoot.contains(el)) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function normKey(label: string): string {
  return normalizeLinkedInLabel(label)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function labelsMatch(candidate: string, target: string): boolean {
  return normKey(candidate) === normKey(target);
}

/** Controlos que nunca devem ser alvos de autofill. */
export function isIgnoredAutofillTarget(el: HTMLElement): boolean {
  if (el instanceof HTMLButtonElement) return true;
  if (el instanceof HTMLInputElement) {
    const t = el.type?.toLowerCase();
    return ["submit", "button", "reset", "image", "hidden", "file", "checkbox"].includes(t ?? "text");
  }
  return false;
}

function isNoiseLabel(raw: string): boolean {
  return /^(voltar|back|cancel|discard|proximo|next|review|submit|enviar|discard application)$/i.test(raw.trim());
}

function controlLabelFallback(ctrl: HTMLElement, modalRoot: HTMLElement): string | null {
  const win = getWindow(modalRoot);
  if (!win || !isElementAcceptable(ctrl, modalRoot)) return null;

  const labelledBy = ctrl.getAttribute("aria-labelledby");
  if (labelledBy) {
    const escapeId =
      typeof CSS !== "undefined" && typeof CSS.escape === "function"
        ? (id: string) => CSS.escape(id)
        : (id: string) => id.replace(/([.#:[\],=$'"\\])/g, "\\$1");
    const parts = labelledBy
      .split(/\s+/)
      .map((id) => ctrl.ownerDocument.querySelector(`#${escapeId(id)}`))
      .filter(Boolean) as Element[];
    const txt = parts
      .map((p) => normalizeLinkedInLabel(p.textContent ?? ""))
      .filter(Boolean)
      .join(" ");
    if (txt.length >= 3) return txt;
  }

  const aria = ctrl.getAttribute("aria-label");
  if (aria && aria.trim().length >= 3) return normalizeLinkedInLabel(aria);

  const ph = (ctrl as HTMLInputElement).placeholder?.trim();
  if (ph && ph.length >= 16 && !/^(optional|opcional|select an option|type here)\b/i.test(ph))
    return normalizeLinkedInLabel(ph);

  const wrap = ctrl.closest(
    ".jobs-easy-apply-form-element, .fb-dash-form-element, [data-test-form-builder-modal-form-element]",
  );
  if (wrap) {
    const labelish = wrap.querySelector<HTMLElement>(
      ".jobs-easy-apply-form-element__label, .jobs-easy-apply-form-element__label-text, .fb-dash-form-element__label, legend",
    );
    if (labelish && isElementAcceptable(labelish, modalRoot))
      return normalizeLinkedInLabel(labelish.textContent ?? "");
  }

  return null;
}

/** Recolhe rádios com o mesmo nome no âmbito (fieldset/container/modal). */
function collectRadioGroup(radio: HTMLInputElement, modalRoot: HTMLElement): HTMLInputElement[] {
  const name = radio.name;
  const scope =
    radio.closest("fieldset") ??
    radio.closest(".jobs-easy-apply-form-element") ??
    radio.closest(".fb-dash-form-element") ??
    modalRoot;
  const all = [...scope.querySelectorAll<HTMLInputElement>('input[type="radio"]')]
    .filter((r) => (name ? r.name === name : r === radio))
    .filter((r) => isElementAcceptable(r, modalRoot) && !r.disabled);
  return all.length ? all : [radio].filter((r) => isElementAcceptable(r, modalRoot) && !r.disabled);
}

function toResolved(control: HTMLElement, modalRoot: HTMLElement): ResolvedField | null {
  if (!isElementAcceptable(control as HTMLElement, modalRoot)) return null;

  if (control instanceof HTMLTextAreaElement) return { kind: "textarea", el: control };

  if (control instanceof HTMLSelectElement) return { kind: "select", el: control };

  if (control instanceof HTMLInputElement) {
    const ti = control.type?.toLowerCase();
    if (ti === "submit" || ti === "button") return null;
    if (ti === "radio") return { kind: "radio-group", inputs: collectRadioGroup(control, modalRoot) };
    return { kind: "input", el: control };
  }

  return null;
}

/**
 * Associa texto de pergunta (tal como sai do parser) ao controlo atual visível.
 */
export function resolveVisibleField(modalRoot: HTMLElement, questionLabel: string): ResolvedField | null {
  if (!modalRoot.ownerDocument.body) return null;
  const target = normalizeLinkedInLabel(questionLabel).trim();

  /* 1) label[for] */
  /** label explícito for */
  for (const lab of [...modalRoot.querySelectorAll<HTMLLabelElement>("label[for]")]) {
    if (!isElementAcceptable(lab, modalRoot)) continue;
    const t = normalizeLinkedInLabel(lab.textContent ?? "");
    if (!t || t.length < 3 || isNoiseLabel(t)) continue;
    if (!labelsMatch(t, target)) continue;
    const id = lab.htmlFor ?? lab.getAttribute("for");
    if (!id) continue;
    const ctl = modalRoot.ownerDocument.getElementById(id);
    if (!ctl || !modalRoot.contains(ctl)) continue;
    const r = toResolved(ctl as HTMLElement, modalRoot);
    if (r) return r;
  }

  /* 2) label sem for — controlos descendentes */
  for (const lab of [...modalRoot.querySelectorAll("label:not([for])")]) {
    if (!(lab instanceof HTMLElement) || !isElementAcceptable(lab, modalRoot)) continue;
    const t = normalizeLinkedInLabel(lab.textContent ?? "");
    if (!labelsMatch(t, target)) continue;
    const inner = lab.querySelector(CONTROL_SELECTOR);
    if (!(inner instanceof HTMLElement)) continue;
    const r = toResolved(inner, modalRoot);
    if (r) return r;
  }

  /* 3) fieldsets com legend compatível → rádios ou controlo dentro */
  for (const fs of [...modalRoot.querySelectorAll("fieldset")]) {
    const leg = fs.querySelector("legend");
    const legTxt = leg ? normalizeLinkedInLabel(leg.textContent ?? "") : "";
    if (!legTxt || !labelsMatch(legTxt, target)) continue;
    const radios = [...fs.querySelectorAll<HTMLInputElement>('input[type="radio"]')]
      .filter((r) => isElementAcceptable(r, modalRoot) && !r.disabled);
    if (radios.length) return { kind: "radio-group", inputs: collectRadioGroup(radios[0]!, modalRoot) };

    const other = fs.querySelector(CONTROL_SELECTOR);
    if (!(other instanceof HTMLElement)) continue;
    const r = toResolved(other, modalRoot);
    if (r) return r;
  }

  /* 4) blocos de label LinkedIn ligados pelo texto (+ legend acima só parcialmente duplicados) */
  for (const el of [...modalRoot.querySelectorAll(LABEL_SELECTOR)]) {
    if (!(el instanceof HTMLElement) || !isElementAcceptable(el, modalRoot)) continue;
    if (el.tagName === "LEGEND") continue;
    const raw = normalizeLinkedInLabel(el.textContent ?? "");
    if (raw.length < 3 || isNoiseLabel(raw)) continue;
    if (!labelsMatch(raw, target)) continue;

    const forAttr = el.getAttribute?.("for");
    if (forAttr) {
      const ctl = modalRoot.ownerDocument.getElementById(forAttr);
      if (ctl instanceof HTMLElement && modalRoot.contains(ctl)) {
        const r = toResolved(ctl, modalRoot);
        if (r) return r;
      }
    }

    const wrap = el.closest(
      ".jobs-easy-apply-form-element, .fb-dash-form-element, fieldset, [data-test-form-builder-modal-form-element]",
    );
    if (wrap) {
      const ctl = wrap.querySelector(CONTROL_SELECTOR);
      if (ctl instanceof HTMLElement) {
        const r = toResolved(ctl, modalRoot);
        if (r) return r;
      }
      const radios = [...wrap.querySelectorAll<HTMLInputElement>('input[type="radio"]')].filter(
        (x) => isElementAcceptable(x, modalRoot) && !x.disabled,
      );
      if (radios.length) return { kind: "radio-group", inputs: collectRadioGroup(radios[0]!, modalRoot) };
    }
  }

  /* 5) controles + fallback texto (proximidade lógica: mesmo markup que o parser) */
  const seenRadios = new Set<HTMLElement>();
  for (const ctl of [...modalRoot.querySelectorAll(CONTROL_SELECTOR)]) {
    if (!(ctl instanceof HTMLElement)) continue;
    if (ctl instanceof HTMLInputElement && ctl.type?.toLowerCase() === "radio") {
      if (seenRadios.has(ctl)) continue;
      for (const rr of collectRadioGroup(ctl, modalRoot)) seenRadios.add(rr);
    }
    const fallback = controlLabelFallback(ctl, modalRoot);
    if (!fallback) continue;
    if (!labelsMatch(fallback, target)) continue;
    const r = toResolved(ctl, modalRoot);
    if (r) return r;
  }

  return null;
}
