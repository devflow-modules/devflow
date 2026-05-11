const OUTLINE = "2px solid #2563eb";
const SHADOW = "0 0 0 3px rgba(37, 99, 235, 0.35)";

type InlineStyleSnapshot = Pick<CSSStyleDeclaration, "outline" | "outlineOffset" | "boxShadow" | "transition">;

function readSnapshot(el: HTMLElement): InlineStyleSnapshot {
  return {
    outline: el.style.outline,
    outlineOffset: el.style.outlineOffset,
    boxShadow: el.style.boxShadow,
    transition: el.style.transition,
  };
}

function restore(el: HTMLElement, snap: InlineStyleSnapshot): void {
  el.style.outline = snap.outline;
  el.style.outlineOffset = snap.outlineOffset;
  el.style.boxShadow = snap.boxShadow;
  el.style.transition = snap.transition;
}

/**
 * Realce temporário no campo ou num contentor (ex.: wrapper do LinkedIn).
 * Não persiste após o timeout.
 */
export function highlightFilledField(el: HTMLElement, ms = 1800): void {
  const snap = readSnapshot(el);
  el.style.transition = "outline 0.15s ease, box-shadow 0.15s ease";
  el.style.outline = OUTLINE;
  el.style.outlineOffset = "2px";
  el.style.boxShadow = SHADOW;
  window.setTimeout(() => restore(el, snap), ms);
}
