/**
 * Heurística best-effort: o DOM do LinkedIn muda com frequência.
 * Não altera o chat — só informa o painel ApplyFlow para sugerir "Mover" / minimizar.
 */
const SELECTORS = [
  '[data-test-msg-ui-root]',
  ".msg-overlay-list-bubble-header",
  ".msg-overlay-bubble-header",
  "aside[aria-label*='essaging' i]",
  "aside[aria-label*='ensajes' i]",
  "aside[aria-label*='ensaj' i]",
] as const;

export function detectLinkedInMessagingChromeVisible(): boolean {
  if (typeof document === "undefined") return false;
  for (const sel of SELECTORS) {
    let el: Element | null = null;
    try {
      el = document.querySelector(sel);
    } catch {
      continue;
    }
    if (!(el instanceof HTMLElement)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 24 || r.height < 24) continue;
    if (r.bottom < 0 || r.right < 0 || r.top > window.innerHeight || r.left > window.innerWidth) continue;
    return true;
  }
  return false;
}
