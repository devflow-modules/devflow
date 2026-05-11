import { normalizeLinkedInLabel } from "./normalize-label.js";

const LABEL_SELECTOR = [
  'label[for]',
  /** LinkedIn pode renderizar perguntas em labels genéricos */
  "label:not([for])",
  "fieldset legend",
  ".jobs-easy-apply-form-element__label",
  ".jobs-easy-apply-form-element__label-text",
  ".fb-dash-form-element__label",
  ".fb-dash-form-element__label-text",
  "[data-test-form-builder-modal-form-element] label",
  /** Pergunta em span/div dentro do bloco de formulário */
  ".jobs-easy-apply-form-element .text-body-medium",
  ".jobs-easy-apply-form-element .text-body-small",
].join(",");

/** Controles cuja etiqueta pode vir só de aria-label / placeholder */
const CONTROL_SELECTOR = [
  'input:not([type="hidden"])',
  "select",
  "textarea",
].join(",");

function getWindow(el: HTMLElement): (Window & typeof globalThis) | null {
  return el.ownerDocument?.defaultView ?? null;
}

/**
 * Mesma semântica do content script original: elementos com layout visível no viewport.
 */
function defaultIsVisible(el: Element, modalRoot: HTMLElement): boolean {
  const win = getWindow(modalRoot);
  if (!(el instanceof HTMLElement) || !win) return false;
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

function controlLabelFallback(ctrl: HTMLElement, modalRoot: HTMLElement): string | null {
  const win = getWindow(modalRoot);
  if (!win) return null;
  if (!defaultIsVisible(ctrl, modalRoot)) return null;

  const labelledBy = ctrl.getAttribute("aria-labelledby");
  if (labelledBy) {
    const escapeId =
      typeof CSS !== "undefined" && typeof CSS.escape === "function"
        ? (id: string) => CSS.escape(id)
        : (id: string) => id.replace(/([.#:[\],=$'"\\])/g, "\\$1");
    const parts = labelledBy
      .split(/\s+/)
      .map((id) => modalRoot.querySelector(`#${escapeId(id)}`))
      .filter(Boolean) as Element[];
    const txt = parts
      .map((p) => normalizeLinkedInLabel(p.textContent ?? ""))
      .filter(Boolean)
      .join(" ");
    if (txt.length >= 3) return txt;
  }

  const aria = ctrl.getAttribute("aria-label");
  if (aria && aria.trim().length >= 3) {
    return normalizeLinkedInLabel(aria);
  }

  const ph = (ctrl as HTMLInputElement).placeholder?.trim();
  if (ph && ph.length >= 16 && !/^(optional|opcional|select an option|type here)\b/i.test(ph)) {
    return normalizeLinkedInLabel(ph);
  }

  const wrap = ctrl.closest(
    ".jobs-easy-apply-form-element, .fb-dash-form-element, [data-test-form-builder-modal-form-element]",
  );
  if (wrap) {
    const labelish = wrap.querySelector<HTMLElement>(
      ".jobs-easy-apply-form-element__label, .jobs-easy-apply-form-element__label-text, .fb-dash-form-element__label, legend",
    );
    if (labelish && defaultIsVisible(labelish, modalRoot)) {
      const t = normalizeLinkedInLabel(labelish.textContent ?? "");
      if (t.length >= 3) return t;
    }
  }

  return null;
}

function isNoiseLabel(raw: string): boolean {
  return /^(voltar|back|cancel|discard|proximo|next|review|submit|enviar|discard application)$/i.test(raw);
}

export type ParseEasyApplyModalOptions = {
  /** Para testes ou ambientes sem `window` global coerente com o `modalRoot`. */
  isVisible?: (el: Element, modalRoot: HTMLElement) => boolean;
};

/**
 * Extrai rótulos de perguntas visíveis dentro do modal Easy Apply.
 * Heurística resiliente — pensada para reutilização no pacote e no content script.
 */
export function parseEasyApplyModalFields(
  modalRoot: HTMLElement,
  options?: ParseEasyApplyModalOptions,
): string[] {
  const visible = options?.isVisible ?? ((el: Element, root: HTMLElement) => defaultIsVisible(el, root));
  const out: string[] = [];
  const seen = new Set<string>();

  modalRoot.querySelectorAll<HTMLElement>(LABEL_SELECTOR).forEach((el) => {
    if (!visible(el, modalRoot)) return;
    const raw = normalizeLinkedInLabel(el.textContent ?? "");
    if (raw.length < 3 || raw.length > 450) return;
    if (isNoiseLabel(raw)) return;
    const key = raw.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(raw);
  });

  modalRoot.querySelectorAll<HTMLElement>(CONTROL_SELECTOR).forEach((ctrl) => {
    if (!visible(ctrl, modalRoot)) return;
    const fallback = controlLabelFallback(ctrl, modalRoot);
    if (!fallback) return;
    if (fallback.length < 3 || fallback.length > 450) return;
    if (isNoiseLabel(fallback)) return;
    const key = fallback.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(fallback);
  });

  return out;
}
