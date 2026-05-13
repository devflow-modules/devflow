import type { PanelDockSide } from "../storage/panel-ui-storage.js";

const SAFE_R = "max(12px, env(safe-area-inset-right, 0px))";
const SAFE_L = "max(12px, env(safe-area-inset-left, 0px))";

/** Aplica geometria do host fixo (fora do Shadow DOM). */
export function applyPanelHostLayout(host: HTMLDivElement, dock: PanelDockSide, minimized: boolean): void {
  const base: Partial<CSSStyleDeclaration> = {
    position: "fixed",
    zIndex: "2147483000",
    pointerEvents: "auto",
    isolation: "isolate",
    contain: "layout paint",
    boxSizing: "border-box",
  };

  if (minimized) {
    Object.assign(host.style, base, {
      top: "auto",
      bottom: "16px",
      width: "auto",
      minWidth: "auto",
      maxWidth: "none",
      height: "auto",
      maxHeight: "none",
      overflow: "visible",
      ...(dock === "right"
        ? { right: SAFE_R, left: "auto" }
        : { left: SAFE_L, right: "auto" }),
    });
    return;
  }

  Object.assign(host.style, base, {
    top: "72px",
    bottom: "16px",
    maxHeight: "calc(100vh - 88px)",
    width: "min(380px, calc(100vw - 24px))",
    maxWidth: "400px",
    minWidth: "260px",
    overflow: "hidden",
    ...(dock === "right"
      ? { right: SAFE_R, left: "auto" }
      : { left: SAFE_L, right: "auto" }),
  });
}
