import { isModalFieldElementVisible } from "@devflow/applyflow-linkedin";

const HINT_SELECTORS = [
  ".jobs-easy-apply-modal",
  ".jobs-easy-apply-content",
  '[data-test-modal="jobs-easy-apply-modal"]',
  ".artdeco-modal.jobs-easy-apply-modal",
] as const;

const DOM_MARKERS =
  ".jobs-easy-apply-modal, .jobs-easy-apply-content, .jobs-easy-apply-form-element, .fb-dash-form-element, [data-test-modal='jobs-easy-apply-modal'], [data-test-form-builder-modal-form-element]";

const FORM_CONTROL_SELECTOR =
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), select, textarea';

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function dialogSampleText(d: HTMLElement): string {
  const raw =
    typeof d.innerText === "string" && d.innerText.length > 0
      ? d.innerText
      : (d.textContent ?? "");
  return raw.slice(0, 15_000);
}

function hasDomMarkers(root: HTMLElement): boolean {
  return root.querySelector(DOM_MARKERS) !== null;
}

/** Frases e títulos típicos do fluxo Easy Apply (PT/EN), incluindo modais sem a palavra "easy apply". */
function containsEasyApplySignals(text: string): boolean {
  const lc = text.toLowerCase();
  const nd = stripAccents(lc);
  return (
    nd.includes("easy apply") ||
    lc.includes("candidatura simplificada") ||
    nd.includes("enviar candidatura") ||
    nd.includes("submit your application") ||
    nd.includes("candidate-se na") ||
    /\bapply\s+to\b/i.test(text) ||
    nd.includes("candidatar-se") ||
    lc.includes("candidatura via linkedin") ||
    lc.includes("perguntas adicionais") ||
    nd.includes("additional questions")
  );
}

/** Botões / chrome de fluxo de candidatura no LinkedIn (texto visível no modal). */
function hasLinkedInApplyFlowChrome(text: string): boolean {
  const nd = stripAccents(text.toLowerCase());
  return (
    /\brevisar\b/.test(nd) ||
    /\bvoltar\b/.test(nd) ||
    /\bavancar\b/.test(nd) ||
    /\bproximo\b/.test(nd) ||
    /\bnext\b/.test(nd) ||
    /\bback\b/.test(nd) ||
    /\breview\b/.test(nd) ||
    /\bcontinue\b/.test(nd) ||
    /\bcontinuar\b/.test(nd) ||
    (/\benviar\b/.test(nd) && /\bcandidatur/.test(nd)) ||
    (/\bsubmit\b/.test(nd) && /\bapplication\b/.test(nd))
  );
}

function minDialogSize(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  return r.width >= 180 && r.height >= 100;
}

function countVisibleFormControls(modalRoot: HTMLElement): number {
  let n = 0;
  modalRoot.querySelectorAll(FORM_CONTROL_SELECTOR).forEach((el) => {
    if (el instanceof HTMLElement && isModalFieldElementVisible(el, modalRoot)) n++;
  });
  return n;
}

function isEasyApplyCompatibleDialog(d: HTMLElement): boolean {
  if (!minDialogSize(d)) return false;
  const controls = countVisibleFormControls(d);
  if (controls < 1) return false;
  const text = dialogSampleText(d);
  return hasDomMarkers(d) || containsEasyApplySignals(text) || hasLinkedInApplyFlowChrome(text);
}

function dialogPriorityScore(d: HTMLElement): number {
  const controls = countVisibleFormControls(d);
  let s = controls * 15;
  const text = dialogSampleText(d);
  if (hasDomMarkers(d)) s += 800;
  if (containsEasyApplySignals(text)) s += 200;
  if (hasLinkedInApplyFlowChrome(text)) s += 120;
  const r = d.getBoundingClientRect();
  s += Math.min(400, Math.floor((r.width * r.height) / 5000));
  return s;
}

function scanDialogsForEasyApply(): HTMLElement | null {
  const dialogs = Array.from(document.querySelectorAll('[role="dialog"]')).filter(
    (n): n is HTMLElement => n instanceof HTMLElement,
  );
  const candidates = dialogs.filter(isEasyApplyCompatibleDialog);
  if (!candidates.length) return null;
  candidates.sort((a, b) => dialogPriorityScore(b) - dialogPriorityScore(a));
  return candidates[0] ?? null;
}

export type FindEasyApplyModalMeta = {
  modal: HTMLElement | null;
  via: "hint_selector" | "dialog_heuristic" | null;
  hintSelector?: string;
};

export function findEasyApplyModalWithMeta(): FindEasyApplyModalMeta {
  for (const sel of HINT_SELECTORS) {
    const el = document.querySelector(sel);
    if (el instanceof HTMLElement) {
      const dialog = el.closest('[role="dialog"]');
      const target = (dialog ?? el) as HTMLElement;
      return { modal: target, via: "hint_selector", hintSelector: sel };
    }
  }
  const modal = scanDialogsForEasyApply();
  return { modal, via: modal ? "dialog_heuristic" : null };
}

/** Localiza o contentor do modal Easy Apply (evita dependência circular com `inject-applyflow-panel`). */
export function findEasyApplyModal(): HTMLElement | null {
  return findEasyApplyModalWithMeta().modal;
}

export type EasyApplyModalScanRow = {
  index: number;
  w: number;
  h: number;
  controls: number;
  accepted: boolean;
  reason: string;
};

/**
 * Resumo sem PII para `APPLYFLOW_DEBUG`: candidatos `[role=dialog]`, tamanho, controles e motivo de aceitar/rejeitar.
 */
export function debugScanEasyApplyModals(): { dialogCount: number; rows: EasyApplyModalScanRow[] } {
  const dialogs = Array.from(document.querySelectorAll('[role="dialog"]')).filter(
    (n): n is HTMLElement => n instanceof HTMLElement,
  );
  const rows: EasyApplyModalScanRow[] = dialogs.map((d, index) => {
    const r = d.getBoundingClientRect();
    const controls = countVisibleFormControls(d);
    const accepted = isEasyApplyCompatibleDialog(d);
    let reason = "ok";
    if (r.width < 180) reason = "reject_small_width";
    else if (r.height < 100) reason = "reject_small_height";
    else if (controls < 1) reason = "reject_no_visible_controls";
    else if (!hasDomMarkers(d) && !containsEasyApplySignals(dialogSampleText(d)) && !hasLinkedInApplyFlowChrome(dialogSampleText(d))) {
      reason = "reject_no_easy_apply_signals";
    }
    return {
      index,
      w: Math.round(r.width),
      h: Math.round(r.height),
      controls,
      accepted,
      reason,
    };
  });
  return { dialogCount: dialogs.length, rows };
}
